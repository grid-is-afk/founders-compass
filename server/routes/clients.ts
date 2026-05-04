import { Router } from "express";
import bcryptjs from "bcryptjs";
import { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

const ALLOWED_COLUMNS = new Set([
  "name",
  "contact_name",
  "contact_email",
  "revenue",
  "stage",
  "current_quarter",
  "current_year",
  "capital_readiness",
  "customer_capital",
  "performance_score",
  "entity_type",
  "q1_phase",
  "q2_phase",
  "q3_phase",
  "q4_phase",
  "source_prospect_id",
  "onboarded_at",
]);

/** Returns true if this user can access all clients (admin always can; advisors check DB flag). */
async function canSeeAll(userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  const r = await query("SELECT see_all_clients FROM users WHERE id = $1", [userId]);
  return r.rows[0]?.see_all_clients ?? true;
}

/** Generate a readable 10-char password — no ambiguous chars (0/O, 1/l/I) */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// GET /api/clients
router.get("/", async (req, res) => {
  try {
    // Advisors see all their clients; clients are redirected to /me
    if (req.user!.role === "client") {
      const result = await query(
        "SELECT * FROM clients WHERE user_id = $1",
        [req.user!.id]
      );
      return res.json(result.rows);
    }

    const seeAll = await canSeeAll(req.user!.id, req.user!.role);
    const result = seeAll
      ? await query("SELECT * FROM clients ORDER BY name")
      : await query("SELECT * FROM clients WHERE advisor_id = $1 ORDER BY name", [req.user!.id]);
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clients
router.post("/", async (req, res) => {
  const {
    name,
    contact_name,
    contact_email,
    revenue,
    stage,
    current_quarter,
    current_year,
    capital_readiness,
    customer_capital,
    performance_score,
    entity_type,
    q1_phase,
    onboarded_at,
    source_prospect_id,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Client name is required" });
  }

  if (!contact_email) {
    return res.status(400).json({ error: "Contact email is required to create a client login" });
  }

  try {
    // Generate credentials for the client portal login
    const generatedPassword = generatePassword();
    const passwordHash = await bcryptjs.hash(generatedPassword, 12);

    // Check if user already exists — never silently overwrite an existing password
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [contact_email.toLowerCase()]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: "A user with this email already exists. Use a different email for this client.",
      });
    }

    // Create a fresh user account for the new client
    const userResult = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'client')
       RETURNING id`,
      [contact_email.toLowerCase(), passwordHash, contact_name?.trim() || name]
    );
    const clientUserId = userResult.rows[0].id;

    // Create the client record linked to both advisor and the new user account
    const clientResult = await query(
      `INSERT INTO clients
         (advisor_id, user_id, name, contact_name, contact_email, revenue, stage,
          current_quarter, current_year, capital_readiness, customer_capital, performance_score,
          entity_type, q1_phase, onboarded_at, source_prospect_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        req.user!.id,
        clientUserId,
        name,
        contact_name ?? null,
        contact_email.toLowerCase(),
        revenue ?? null,
        stage ?? "Q1 — Discover",
        current_quarter ?? 1,
        current_year ?? 2026,
        capital_readiness ?? 0,
        customer_capital ?? 0,
        performance_score ?? 0,
        entity_type ?? null,
        q1_phase ?? "kickoff",
        onboarded_at ?? new Date().toISOString(),
        source_prospect_id ?? null,
      ]
    );

    const newClientId = clientResult.rows[0].id;

    // Promote prospect documents to the new client's data room
    if (source_prospect_id) {
      try {
        await query(
          `UPDATE documents SET client_id = $1, prospect_id = NULL WHERE prospect_id = $2`,
          [newClientId, source_prospect_id]
        );
      } catch (docErr) {
        // Non-fatal — enrollment still succeeds even if doc migration fails
        console.warn("Document promotion failed during enrollment:", docErr);
      }
    }

    // Return the client record + generated credentials (shown once to advisor)
    return res.status(201).json({
      ...clientResult.rows[0],
      generatedCredentials: {
        email: contact_email.toLowerCase(),
        password: generatedPassword,
      },
    });
  } catch (err) {
    console.error("POST /clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clients/me — returns the client record for the logged-in client user
// IMPORTANT: must be defined BEFORE /:id so Express doesn't treat "me" as an ID
router.get("/me", async (req, res) => {
  if (req.user!.role !== "client") {
    return res.status(403).json({ error: "Not a client user" });
  }
  try {
    const result = await query(
      "SELECT * FROM clients WHERE user_id = $1",
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No client record found for this user" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /clients/me error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clients/:id
router.get("/:id", async (req, res) => {
  try {
    // Client users can only fetch their own record
    if (req.user!.role === "client") {
      const result = await query(
        "SELECT * FROM clients WHERE id = $1 AND user_id = $2",
        [req.params.id, req.user!.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Client not found" });
      }
      return res.json(result.rows[0]);
    }

    const seeAll = await canSeeAll(req.user!.id, req.user!.role);
    const result = seeAll
      ? await query("SELECT * FROM clients WHERE id = $1", [req.params.id])
      : await query("SELECT * FROM clients WHERE id = $1 AND advisor_id = $2", [req.params.id, req.user!.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/clients/:id
router.patch("/:id", async (req, res) => {
  const fields = req.body;
  const keys = Object.keys(fields).filter((k) => ALLOWED_COLUMNS.has(k));
  if (keys.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    // FIX-2B: If source_prospect_id is being set, verify the prospect belongs to this advisor.
    if ("source_prospect_id" in fields && fields.source_prospect_id != null) {
      const prospectCheck = await query(
        "SELECT id FROM prospects WHERE id = $1 AND advisor_id = $2",
        [fields.source_prospect_id, req.user!.id]
      );
      if (prospectCheck.rows.length === 0) {
        return res.status(403).json({ error: "Prospect not found or access denied" });
      }
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);
    const seeAll = await canSeeAll(req.user!.id, req.user!.role);

    const result = seeAll
      ? await query(
          `UPDATE clients SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
          [...values, req.params.id]
        )
      : await query(
          `UPDATE clients SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${keys.length + 1} AND advisor_id = $${keys.length + 2} RETURNING *`,
          [...values, req.params.id, req.user!.id]
        );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /clients/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/clients/:id
router.delete("/:id", async (req, res) => {
  try {
    const isAdmin = req.user!.role === "admin";
    const result = isAdmin
      ? await query("DELETE FROM clients WHERE id = $1 RETURNING id", [req.params.id])
      : await query("DELETE FROM clients WHERE id = $1 AND advisor_id = $2 RETURNING id", [req.params.id, req.user!.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Client not found or access denied" });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /clients/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

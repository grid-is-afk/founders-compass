import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const ALLOWED_COLUMNS = new Set(["name", "role", "email", "notes", "tier"]);

async function verifyClient(clientId: string, userId: string, userRole: string) {
  if (userRole === "admin") {
    const r = await query(`SELECT id FROM clients WHERE id = $1`, [clientId]);
    return r.rows.length > 0;
  }
  const col = userRole === "client" ? "user_id" : "advisor_id";
  const result = await query(
    `SELECT id FROM clients WHERE id = $1 AND ${col} = $2`,
    [clientId, userId]
  );
  return result.rows.length > 0;
}

// GET /api/stakeholders?client_id=xxx
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClient(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `SELECT * FROM stakeholders WHERE client_id = $1 ORDER BY tier ASC, name ASC`,
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /stakeholders error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/stakeholders
router.post("/", async (req, res) => {
  const { client_id, name, role, email, notes, tier } = req.body;
  if (!client_id || !name) {
    return res.status(400).json({ error: "client_id and name required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO stakeholders (client_id, name, role, email, notes, tier)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [client_id, name, role ?? null, email ?? null, notes ?? null, tier ?? "primary"]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /stakeholders error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/stakeholders/:id
router.patch("/:id", async (req, res) => {
  const raw = req.body;
  const fields: Record<string, unknown> = {};
  for (const k of Object.keys(raw)) {
    if (ALLOWED_COLUMNS.has(k)) fields[k] = raw[k];
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const existing = await query(
      `SELECT s.*, c.advisor_id, c.user_id FROM stakeholders s
       JOIN clients c ON c.id = s.client_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Stakeholder not found" });
    }
    const row = existing.rows[0];
    if (
      req.user!.role !== "admin" &&
      row.advisor_id !== req.user!.id &&
      row.user_id !== req.user!.id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE stakeholders SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /stakeholders/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/stakeholders/:id
router.delete("/:id", async (req, res) => {
  try {
    const existing = await query(
      `SELECT s.*, c.advisor_id FROM stakeholders s
       JOIN clients c ON c.id = s.client_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Stakeholder not found" });
    }
    if (req.user!.role !== "admin" && existing.rows[0].advisor_id !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM stakeholders WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /stakeholders/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

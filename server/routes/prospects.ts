import { Router } from "express";
import { query } from "../db.js";
import { ingestDocument } from "../lib/ingestion.js";
import { verifyClientAccess } from "../lib/verifyClient.js";

const router = Router();

// Subselect: the existing client (if any) that shares this prospect's contact
// email. Email is intentionally NOT unique (a handler/licensee can own many
// clients under one email), so this only SUGGESTS a possible duplicate the user
// confirms — it never drives an automatic action.
const POSSIBLE_CLIENT_MATCH_SQL = `
  (SELECT json_build_object('id', c.id, 'name', c.name)
     FROM clients c
    WHERE p.contact IS NOT NULL
      AND LOWER(c.contact_email) = LOWER(p.contact)
      AND (c.archived IS NULL OR c.archived = false)
    ORDER BY c.created_at ASC NULLS LAST
    LIMIT 1) AS possible_client_match`;

const ALLOWED_COLUMNS = new Set([
  "name",
  "contact",
  "company",
  "revenue",
  "source",
  "status",
  "fit_score",
  "fit_decision",
  "notes",
  "nurture_call_date",
]);

const VALID_STATUSES = new Set([
  "intake",
  "discovery_scheduled",
  "discovery_complete",
  "fit_assessment",
  "not_fit",
  "fit",
  "onboarding",
  "nurture_call",
  "kept_in_loop",
  "flagged_follow_up",
]);

// GET /api/prospects
router.get("/", async (req, res) => {
  const isTeamMember = req.user!.role !== "client";
  try {
    const result = isTeamMember
      ? await query(
          `SELECT p.*, u.name AS advisor_name, ${POSSIBLE_CLIENT_MATCH_SQL}
           FROM prospects p
           LEFT JOIN users u ON u.id = p.advisor_id
           ORDER BY p.created_at DESC`
        )
      : await query(
          `SELECT p.*, u.name AS advisor_name, ${POSSIBLE_CLIENT_MATCH_SQL}
           FROM prospects p
           LEFT JOIN users u ON u.id = p.advisor_id
           WHERE p.advisor_id = $1
           ORDER BY p.created_at DESC`,
          [req.user!.id]
        );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /prospects error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/prospects
router.post("/", async (req, res) => {
  const { name, contact, company, revenue, source, status, fit_score, fit_decision, notes, date } =
    req.body;

  if (!name) {
    return res.status(400).json({ error: "Prospect name is required" });
  }

  try {
    const result = await query(
      `INSERT INTO prospects
         (advisor_id, name, contact, company, revenue, source, status, fit_score, fit_decision, notes, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user!.id,
        name,
        contact ?? null,
        company ?? null,
        revenue ?? null,
        source ?? null,
        status ?? "intake",
        fit_score ?? null,
        fit_decision ?? null,
        notes ?? null,
        date ?? null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /prospects error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/prospects/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM prospects WHERE id = $1 AND advisor_id = $2",
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Prospect not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /prospects/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/prospects/:id
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

  // Validate status value if provided
  if (fields.status !== undefined && !VALID_STATUSES.has(fields.status as string)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    // Fetch current prospect state before updating so we can detect a fresh flag
    const currentResult = await query(
      "SELECT advisor_id, name, status FROM prospects WHERE id = $1",
      [req.params.id]
    );
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Prospect not found" });
    }
    const current = currentResult.rows[0] as {
      advisor_id: string;
      name: string;
      status: string;
    };

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE prospects
       SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} AND advisor_id = $${keys.length + 2}
       RETURNING *`,
      [...values, req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Prospect not found" });
    }

    // Insert a notification when a prospect is freshly flagged for follow-up
    const isFreshFlag =
      fields.status === "flagged_follow_up" &&
      current.status !== "flagged_follow_up";

    if (isFreshFlag) {
      await query(
        `INSERT INTO notifications (advisor_id, client_id, type, message)
         VALUES ($1, NULL, 'follow_up_flagged', $2)`,
        [
          current.advisor_id,
          `Follow-up flagged for prospect: ${current.name}`,
        ]
      );
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /prospects/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/prospects/:id/link-to-client
// Resolves a "possible duplicate": the prospect is actually an existing client.
// Migrates the prospect's documents (e.g. the synced pitch deck) into that
// client's data room, ingests them for QB AI, then removes the now-redundant
// prospect. Only TFO team members may do this; requires access to the client.
router.post("/:id/link-to-client", async (req, res) => {
  if (req.user!.role === "client") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { client_id } = req.body as { client_id?: string };
  if (!client_id) {
    return res.status(400).json({ error: "client_id is required" });
  }

  try {
    const prospectResult = await query("SELECT id FROM prospects WHERE id = $1", [req.params.id]);
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: "Prospect not found" });
    }
    if (!(await verifyClientAccess(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Migrate the prospect's documents to the client, then ingest for QB AI.
    const promoted = await query(
      `UPDATE documents SET client_id = $1, prospect_id = NULL WHERE prospect_id = $2
       RETURNING id`,
      [client_id, req.params.id]
    );
    for (const row of promoted.rows as { id: string }[]) {
      ingestDocument(row.id, client_id).catch((err) =>
        console.error("QB ingestion failed for linked doc", row.id, err)
      );
    }

    await query("DELETE FROM prospects WHERE id = $1", [req.params.id]);
    return res.json({ ok: true, documentsMigrated: promoted.rows.length });
  } catch (err) {
    console.error("POST /prospects/:id/link-to-client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/prospects/:id
router.delete("/:id", async (req, res) => {
  try {
    await query(
      "DELETE FROM prospects WHERE id = $1 AND advisor_id = $2",
      [req.params.id, req.user!.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /prospects/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

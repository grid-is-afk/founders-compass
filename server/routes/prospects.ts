import { Router } from "express";
import { query } from "../db.js";

const router = Router();

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
]);

// GET /api/prospects
router.get("/", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM prospects WHERE advisor_id = $1 ORDER BY created_at DESC",
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
        status ?? "new",
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

  try {
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
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /prospects/:id error:", err);
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

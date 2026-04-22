import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/clients/:clientId/six-cs
router.get("/:clientId/six-cs", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const clientCheck = await query(
      "SELECT id FROM clients WHERE id = $1 AND advisor_id = $2",
      [clientId, advisorId]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(403).json({ error: "Client not found or access denied" });
    }

    const result = await query(
      `SELECT id, client_id, scores, total_score, notes, completed_at
       FROM client_six_cs
       WHERE client_id = $1
       ORDER BY completed_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows[0] ?? null);
  } catch (err) {
    console.error("GET /clients/:clientId/six-cs error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clients/:clientId/six-cs — upsert
router.post("/:clientId/six-cs", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;
  const { scores, total_score, notes } = req.body;

  if (!scores || typeof scores !== "object") {
    return res.status(400).json({ error: "scores object required" });
  }

  try {
    const clientCheck = await query(
      "SELECT id FROM clients WHERE id = $1 AND advisor_id = $2",
      [clientId, advisorId]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(403).json({ error: "Client not found or access denied" });
    }

    const existing = await query(
      "SELECT id FROM client_six_cs WHERE client_id = $1",
      [clientId]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE client_six_cs
         SET scores = $1, total_score = $2, notes = $3, completed_at = NOW(), updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [JSON.stringify(scores), total_score ?? null, notes ?? null, existing.rows[0].id]
      );
      return res.status(200).json(result.rows[0]);
    }

    result = await query(
      `INSERT INTO client_six_cs (client_id, advisor_id, scores, total_score, notes, completed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [clientId, advisorId, JSON.stringify(scores), total_score ?? null, notes ?? null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /clients/:clientId/six-cs error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

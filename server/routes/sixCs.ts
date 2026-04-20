import { Router } from "express";
import { query } from "../db.js";

const router = Router();

async function requireProspectOwnership(
  res: import("express").Response,
  prospectId: string,
  advisorId: string
): Promise<boolean> {
  const check = await query(
    "SELECT id FROM prospects WHERE id = $1 AND advisor_id = $2",
    [prospectId, advisorId]
  );
  if (check.rows.length === 0) {
    res.status(403).json({ error: "Prospect not found or access denied" });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// GET /api/prospects/six-cs-map
// Query param: ?status=fit_assessment (optional)
// Returns: [{ prospect_id, id, scores, total_score, completed_at }]
// ---------------------------------------------------------------------------
router.get("/six-cs-map", async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT psc.id, psc.prospect_id, psc.scores, psc.total_score, psc.completed_at
      FROM prospect_six_cs psc
      INNER JOIN prospects p ON p.id = psc.prospect_id
      WHERE p.advisor_id = $1
    `;
    const params: unknown[] = [req.user!.id];

    if (status && typeof status === "string") {
      sql += " AND p.status = $2";
      params.push(status);
    }

    sql += " ORDER BY psc.completed_at DESC";

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /six-cs-map error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/prospects/:id/six-cs
// Returns the Six C's record for a prospect, or null.
// ---------------------------------------------------------------------------
router.get("/:prospectId/six-cs", async (req, res) => {
  const { prospectId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireProspectOwnership(res, prospectId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, prospect_id, advisor_id, scores, total_score, notes, completed_at, created_at, updated_at
       FROM prospect_six_cs
       WHERE prospect_id = $1
       ORDER BY completed_at DESC
       LIMIT 1`,
      [prospectId]
    );

    return res.json(result.rows.length === 0 ? null : result.rows[0]);
  } catch (err) {
    console.error("GET /prospects/:id/six-cs error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/prospects/:id/six-cs
// Upsert: inserts new or replaces existing record via DELETE + INSERT.
// Body: { scores: Record<string, number>, total_score: number, notes?: string }
// ---------------------------------------------------------------------------
router.post("/:prospectId/six-cs", async (req, res) => {
  const { prospectId } = req.params;
  const advisorId = req.user!.id;
  const { scores, total_score, notes } = req.body as {
    scores: Record<string, number>;
    total_score: number;
    notes?: string;
  };

  if (!scores || typeof scores !== "object") {
    return res.status(400).json({ error: "scores object is required" });
  }
  if (typeof total_score !== "number") {
    return res.status(400).json({ error: "total_score number is required" });
  }

  try {
    const owned = await requireProspectOwnership(res, prospectId, advisorId);
    if (!owned) return;

    // Delete any existing record then insert fresh (simple upsert pattern)
    await query(
      "DELETE FROM prospect_six_cs WHERE prospect_id = $1 AND advisor_id = $2",
      [prospectId, advisorId]
    );

    const result = await query(
      `INSERT INTO prospect_six_cs
         (prospect_id, advisor_id, scores, total_score, notes, completed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        prospectId,
        advisorId,
        JSON.stringify(scores),
        total_score,
        notes ?? null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /prospects/:id/six-cs error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

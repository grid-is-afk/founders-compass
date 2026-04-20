import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// ---------------------------------------------------------------------------
// Helper — verify the prospect belongs to the requesting advisor.
// Returns the prospect row or throws with a 403/404 response already sent.
// ---------------------------------------------------------------------------
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
// GET /api/prospects/exposure-indexes
// Query param: ?status=intake (optional filter by prospect status)
// Returns: [{ prospect_id, id, category_scores, completed_at }]
// Used by the pipeline page to build a lookup map without N+1 fetching.
// ---------------------------------------------------------------------------
router.get("/exposure-indexes", async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT pei.id, pei.prospect_id, pei.category_scores, pei.completed_at
      FROM prospect_exposure_index pei
      INNER JOIN prospects p ON p.id = pei.prospect_id
      WHERE p.advisor_id = $1
    `;
    const params: unknown[] = [req.user!.id];

    if (status && typeof status === "string") {
      sql += " AND p.status = $2";
      params.push(status);
    }

    sql += " ORDER BY pei.completed_at DESC";

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /exposure-indexes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/prospects/:id/exposure-index
// Returns the assessment for a specific prospect, or null if not taken.
// ---------------------------------------------------------------------------
router.get("/:prospectId/exposure-index", async (req, res) => {
  const { prospectId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireProspectOwnership(res, prospectId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, prospect_id, advisor_id, responses, category_scores, ai_summary, completed_at, created_at, updated_at
       FROM prospect_exposure_index
       WHERE prospect_id = $1
       ORDER BY completed_at DESC
       LIMIT 1`,
      [prospectId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /prospects/:id/exposure-index error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/prospects/:id/exposure-index
// Submit a new assessment. Body: { responses, category_scores }
// ---------------------------------------------------------------------------
router.post("/:prospectId/exposure-index", async (req, res) => {
  const { prospectId } = req.params;
  const advisorId = req.user!.id;
  const { responses, category_scores } = req.body as {
    responses: Record<string, number[]>;
    category_scores: Record<string, number>;
  };

  if (!responses || typeof responses !== "object") {
    return res.status(400).json({ error: "responses object is required" });
  }
  if (!category_scores || typeof category_scores !== "object") {
    return res.status(400).json({ error: "category_scores object is required" });
  }

  try {
    const owned = await requireProspectOwnership(res, prospectId, advisorId);
    if (!owned) return;

    const result = await query(
      `INSERT INTO prospect_exposure_index
         (prospect_id, advisor_id, responses, category_scores, completed_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [prospectId, advisorId, JSON.stringify(responses), JSON.stringify(category_scores)]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /prospects/:id/exposure-index error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/prospects/:id/exposure-index/:eid
// Overwrite an existing assessment (retake).
// ---------------------------------------------------------------------------
router.patch("/:prospectId/exposure-index/:eid", async (req, res) => {
  const { prospectId, eid } = req.params;
  const advisorId = req.user!.id;
  const { responses, category_scores } = req.body as {
    responses: Record<string, number[]>;
    category_scores: Record<string, number>;
  };

  if (!responses || typeof responses !== "object") {
    return res.status(400).json({ error: "responses object is required" });
  }
  if (!category_scores || typeof category_scores !== "object") {
    return res.status(400).json({ error: "category_scores object is required" });
  }

  try {
    const owned = await requireProspectOwnership(res, prospectId, advisorId);
    if (!owned) return;

    const result = await query(
      `UPDATE prospect_exposure_index
       SET responses = $1, category_scores = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND prospect_id = $4 AND advisor_id = $5
       RETURNING *`,
      [
        JSON.stringify(responses),
        JSON.stringify(category_scores),
        eid,
        prospectId,
        advisorId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /prospects/:id/exposure-index/:eid error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

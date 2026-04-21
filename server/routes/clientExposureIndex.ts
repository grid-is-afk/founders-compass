import { Router } from "express";
import pool, { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clients/:clientId/exposure-index
// Returns the latest exposure index record for the client, or null.
// ---------------------------------------------------------------------------
router.get("/:clientId/exposure-index", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id, advisor_id, responses, category_scores, ai_summary, completed_at, created_at, updated_at
       FROM client_exposure_index
       WHERE client_id = $1
       ORDER BY completed_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows.length === 0 ? null : result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:clientId/exposure-index error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients/:clientId/exposure-index
// Upsert: delete existing then insert fresh (same pattern as prospect version).
// Body: { responses, category_scores }
// ---------------------------------------------------------------------------
router.post("/:clientId/exposure-index", async (req, res) => {
  const { clientId } = req.params;
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
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    // FIX-3: Wrap DELETE + INSERT in a transaction so a failed INSERT doesn't
    // leave the client without an exposure-index record.
    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");
      await dbClient.query(
        "DELETE FROM client_exposure_index WHERE client_id = $1 AND advisor_id = $2",
        [clientId, advisorId]
      );
      const result = await dbClient.query(
        `INSERT INTO client_exposure_index
           (client_id, advisor_id, responses, category_scores, completed_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [clientId, advisorId, JSON.stringify(responses), JSON.stringify(category_scores)]
      );
      await dbClient.query("COMMIT");
      return res.status(201).json(result.rows[0]);
    } catch (txErr) {
      await dbClient.query("ROLLBACK");
      throw txErr;
    } finally {
      dbClient.release();
    }
  } catch (err) {
    console.error("POST /clients/:clientId/exposure-index error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

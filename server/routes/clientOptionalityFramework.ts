import { Router } from "express";
import pool, { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clients/:clientId/optionality-framework
// ---------------------------------------------------------------------------
router.get("/:clientId/optionality-framework", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id, advisor_id, responses, ai_summary, completed_at, created_at, updated_at
       FROM client_optionality_framework
       WHERE client_id = $1
       ORDER BY completed_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows.length === 0 ? null : result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:clientId/optionality-framework error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients/:clientId/optionality-framework
// Body: { responses: Record<string, { status: 'yes'|'no', notes: string }> }
// ---------------------------------------------------------------------------
router.post("/:clientId/optionality-framework", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;
  const { responses } = req.body as {
    responses: Record<string, { status: "yes" | "no"; notes: string }>;
  };

  if (!responses || typeof responses !== "object") {
    return res.status(400).json({ error: "responses object is required" });
  }

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    // FIX-3: Wrap DELETE + INSERT in a transaction to prevent data loss on INSERT failure.
    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");
      await dbClient.query(
        "DELETE FROM client_optionality_framework WHERE client_id = $1 AND advisor_id = $2",
        [clientId, advisorId]
      );
      const result = await dbClient.query(
        `INSERT INTO client_optionality_framework
           (client_id, advisor_id, responses, completed_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [clientId, advisorId, JSON.stringify(responses)]
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
    console.error("POST /clients/:clientId/optionality-framework error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

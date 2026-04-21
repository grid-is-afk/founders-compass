import { Router } from "express";
import { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clients/:clientId/ipd-metrics
// Returns the latest IPD metrics record for the client, or null.
// ---------------------------------------------------------------------------
router.get("/:clientId/ipd-metrics", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id,
              persuasiveness_of_problem, confidence_in_solution, combined_index,
              probability_label, problem_axes, solution_axes,
              generated_from_data_room, last_generated_at,
              created_at, updated_at
       FROM client_ipd_metrics
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows.length === 0 ? null : result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:clientId/ipd-metrics error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

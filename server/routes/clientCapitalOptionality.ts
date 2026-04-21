import { Router } from "express";
import pool, { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clients/:clientId/capital-optionality
// Returns the latest capital optionality record for the client, or null.
// ---------------------------------------------------------------------------
router.get("/:clientId/capital-optionality", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id, advisor_id,
              minority_recap_pct, minority_recap_label,
              strategic_acq_pct, strategic_acq_label,
              esop_pct, esop_label,
              full_exit_pct, full_exit_label,
              notes, completed_at, created_at, updated_at
       FROM client_capital_optionality
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows.length === 0 ? null : result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:clientId/capital-optionality error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients/:clientId/capital-optionality
// Upsert: DELETE then INSERT in a transaction.
// Body: { minority_recap_pct, minority_recap_label, strategic_acq_pct,
//         strategic_acq_label, esop_pct, esop_label, full_exit_pct,
//         full_exit_label, notes? }
// ---------------------------------------------------------------------------
router.post("/:clientId/capital-optionality", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;
  const {
    minority_recap_pct = 0,
    minority_recap_label = "Explore",
    strategic_acq_pct = 0,
    strategic_acq_label = "Explore",
    esop_pct = 0,
    esop_label = "Explore",
    full_exit_pct = 0,
    full_exit_label = "Explore",
    notes = null,
  } = req.body as {
    minority_recap_pct?: number;
    minority_recap_label?: string;
    strategic_acq_pct?: number;
    strategic_acq_label?: string;
    esop_pct?: number;
    esop_label?: string;
    full_exit_pct?: number;
    full_exit_label?: string;
    notes?: string | null;
  };

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");
      await dbClient.query(
        "DELETE FROM client_capital_optionality WHERE client_id = $1 AND advisor_id = $2",
        [clientId, advisorId]
      );
      const result = await dbClient.query(
        `INSERT INTO client_capital_optionality
           (client_id, advisor_id,
            minority_recap_pct, minority_recap_label,
            strategic_acq_pct, strategic_acq_label,
            esop_pct, esop_label,
            full_exit_pct, full_exit_label,
            notes, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         RETURNING *`,
        [
          clientId, advisorId,
          minority_recap_pct, minority_recap_label,
          strategic_acq_pct, strategic_acq_label,
          esop_pct, esop_label,
          full_exit_pct, full_exit_label,
          notes,
        ]
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
    console.error("POST /clients/:clientId/capital-optionality error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

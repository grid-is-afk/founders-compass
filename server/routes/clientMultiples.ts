import { Router } from "express";
import pool, { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clients/:clientId/multiples
// Returns the latest multiples record for the client, or null.
// ---------------------------------------------------------------------------
router.get("/:clientId/multiples", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id, advisor_id,
              initial_multiple, current_multiple, best_in_class, goal_multiple,
              notes, updated_at
       FROM client_multiples
       WHERE client_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows.length === 0 ? null : result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:clientId/multiples error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients/:clientId/multiples
// Upsert: DELETE then INSERT in a transaction.
// Body: { initial_multiple?, current_multiple?, best_in_class?, goal_multiple?, notes? }
// ---------------------------------------------------------------------------
router.post("/:clientId/multiples", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;
  const {
    initial_multiple = null,
    current_multiple = null,
    best_in_class = null,
    goal_multiple = null,
    notes = null,
  } = req.body as {
    initial_multiple?: number | null;
    current_multiple?: number | null;
    best_in_class?: number | null;
    goal_multiple?: number | null;
    notes?: string | null;
  };

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");
      await dbClient.query(
        "DELETE FROM client_multiples WHERE client_id = $1 AND advisor_id = $2",
        [clientId, advisorId]
      );
      const result = await dbClient.query(
        `INSERT INTO client_multiples
           (client_id, advisor_id, initial_multiple, current_multiple, best_in_class, goal_multiple, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [clientId, advisorId, initial_multiple, current_multiple, best_in_class, goal_multiple, notes]
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
    console.error("POST /clients/:clientId/multiples error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clients/:clientId/six-keys
// Returns the latest Six Keys record for the client, or null.
// ---------------------------------------------------------------------------
router.get("/:clientId/six-keys", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id, advisor_id,
              clarity, alignment, structure, stewardship, velocity, legacy,
              notes, completed_at, created_at, updated_at
       FROM client_six_keys
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows.length === 0 ? null : result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:clientId/six-keys error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

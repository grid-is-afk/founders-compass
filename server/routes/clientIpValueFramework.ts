import { Router } from "express";
import pool, { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/clients/:clientId/ip-value-framework
// Returns the latest IP Value Framework record for the client, or null.
// ---------------------------------------------------------------------------
router.get("/:clientId/ip-value-framework", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id, advisor_id,
              ip_type, ip_status, valuation_basis, notes, ai_summary,
              completed_at, created_at, updated_at
       FROM client_ip_value_framework
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows.length === 0 ? null : result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:clientId/ip-value-framework error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients/:clientId/ip-value-framework
// Upsert: DELETE then INSERT in a transaction.
// Body: { ip_type, ip_status, valuation_basis, notes? }
// ---------------------------------------------------------------------------
router.post("/:clientId/ip-value-framework", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;
  const {
    ip_type = null,
    ip_status = null,
    valuation_basis = null,
    notes = null,
  } = req.body as {
    ip_type?: string | null;
    ip_status?: string | null;
    valuation_basis?: string | null;
    notes?: string | null;
  };

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");
      await dbClient.query(
        "DELETE FROM client_ip_value_framework WHERE client_id = $1 AND advisor_id = $2",
        [clientId, advisorId]
      );
      const result = await dbClient.query(
        `INSERT INTO client_ip_value_framework
           (client_id, advisor_id, ip_type, ip_status, valuation_basis, notes, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [clientId, advisorId, ip_type, ip_status, valuation_basis, notes]
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
    console.error("POST /clients/:clientId/ip-value-framework error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

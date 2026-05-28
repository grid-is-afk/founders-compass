import { Router } from "express";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";
import { getMethodologyGaps } from "../methodology/recommendations.js";
import { getPhaseForQuarter } from "../methodology/tfo-methodology.js";

const router = Router();

// GET /api/clients/:id/methodology-recommendations
router.get("/:id/methodology-recommendations", async (req, res) => {
  const { id: clientId } = req.params;

  try {
    if (!(await verifyClientAccess(clientId, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const clientResult = await query(
      `SELECT current_quarter FROM clients WHERE id = $1`,
      [clientId]
    );
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const currentQuarter: number = clientResult.rows[0].current_quarter ?? 1;
    const phase = getPhaseForQuarter(currentQuarter);

    const gaps = await getMethodologyGaps(clientId, currentQuarter);

    return res.json({
      gaps,
      phase: phase?.name ?? "Unknown",
      quarter: currentQuarter,
    });
  } catch (err) {
    console.error("GET /api/clients/:id/methodology-recommendations error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

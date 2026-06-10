import { Router } from "express";
import { query } from "../db.js";
import { isHubSpotConfigured } from "../lib/hubspot/client.js";
import { syncProspectsFromHubSpot } from "../lib/hubspot/sync.js";

// Mounted at /api/admin/hubspot — TFO-team only (admin/advisor). The sync is
// one-way (HubSpot → platform) and otherwise runs on the boot scheduler; this
// router exposes an on-demand trigger + a status read for the settings UI.
const router = Router();

function requireTeam(req: any, res: any): boolean {
  if (req.user!.role !== "admin" && req.user!.role !== "advisor") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// GET /api/admin/hubspot/status — last run + watermark + whether configured.
router.get("/status", async (req, res) => {
  if (!requireTeam(req, res)) return;
  try {
    const result = await query(
      `SELECT last_sync_at, last_status, last_error, updated_at
       FROM hubspot_sync_state WHERE id = 1`
    );
    return res.json({
      configured: isHubSpotConfigured(),
      ...(result.rows[0] ?? {}),
    });
  } catch (err) {
    console.error("GET /admin/hubspot/status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/hubspot/sync — run a sync now and return the run summary.
router.post("/sync", async (req, res) => {
  if (!requireTeam(req, res)) return;
  try {
    const result = await syncProspectsFromHubSpot();
    return res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    console.error("POST /admin/hubspot/sync error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

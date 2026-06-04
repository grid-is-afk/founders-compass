import { Router } from "express";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";

// Mounted at /api — referral partner directory + per-client referral requests.
const router = Router();

const PILLARS = ["entity", "ip", "capital", "exit"];
const STATUSES = ["requested", "in_progress", "connected"];

// GET /api/referral-partners — active partner directory (any authenticated user)
router.get("/referral-partners", async (_req, res) => {
  try {
    const r = await query(
      `SELECT id, name, occupation, specialty, testimonials, rating, headshot_url
       FROM referral_partners WHERE active = true ORDER BY specialty NULLS LAST, name`
    );
    return res.json(r.rows);
  } catch (err) {
    console.error("GET /referral-partners error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clients/:id/referrals — referral requests for a client
router.get("/clients/:id/referrals", async (req, res) => {
  try {
    if (!(await verifyClientAccess(req.params.id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Client not found or access denied" });
    }
    const r = await query(
      `SELECT rr.*, rp.name AS partner_name, rp.specialty AS partner_specialty
       FROM referral_requests rr
       LEFT JOIN referral_partners rp ON rp.id = rr.partner_id
       WHERE rr.client_id = $1
       ORDER BY rr.requested_at DESC`,
      [req.params.id]
    );
    return res.json(r.rows);
  } catch (err) {
    console.error("GET /clients/:id/referrals error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clients/:id/referrals — request a referral
router.post("/clients/:id/referrals", async (req, res) => {
  try {
    if (!(await verifyClientAccess(req.params.id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Client not found or access denied" });
    }
    const { pillar, partner_id, note } = req.body as {
      pillar?: string;
      partner_id?: string;
      note?: string;
    };
    if (pillar && !PILLARS.includes(pillar)) {
      return res.status(400).json({ error: "Invalid pillar" });
    }

    // The licensee who owns this client is the client's advisor_id (works whether
    // the request is made by the licensee or by TFO servicing on their behalf).
    const ownerRes = await query(`SELECT advisor_id FROM clients WHERE id = $1`, [req.params.id]);
    const licenseeId = ownerRes.rows[0]?.advisor_id;
    if (!licenseeId) {
      return res.status(404).json({ error: "Client not found" });
    }

    const inserted = await query(
      `INSERT INTO referral_requests (client_id, licensee_id, pillar, partner_id, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, licenseeId, pillar ?? null, partner_id ?? null, note ?? null]
    );

    // V1: TFO ops notification is a stub (email infra deferred). Log so it's traceable.
    console.log(
      `[referral] new request ${inserted.rows[0].id} for client ${req.params.id} (pillar=${pillar ?? "n/a"}) — TFO email deferred`
    );

    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error("POST /clients/:id/referrals error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/referrals/:id — update status / outcome (TFO services these)
router.patch("/referrals/:id", async (req, res) => {
  try {
    // Resolve the referral's client to authorize access
    const refRes = await query(`SELECT client_id FROM referral_requests WHERE id = $1`, [req.params.id]);
    if (refRes.rows.length === 0) {
      return res.status(404).json({ error: "Referral not found" });
    }
    if (!(await verifyClientAccess(refRes.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { status, outcome } = req.body as { status?: string; outcome?: string };
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (status) { sets.push(`status = $${sets.length + 1}`); vals.push(status); }
    if (outcome !== undefined) { sets.push(`outcome = $${sets.length + 1}`); vals.push(outcome); }
    if (sets.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    vals.push(req.params.id);
    const updated = await query(
      `UPDATE referral_requests SET ${sets.join(", ")}, updated_at = NOW()
       WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return res.json(updated.rows[0]);
  } catch (err) {
    console.error("PATCH /referrals/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

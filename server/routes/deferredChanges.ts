import { Router } from "express";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";

const router = Router();

// ── PATCH /api/deferred-changes/:id (UC-03) ───────────────────────────────────
// Body: { status: 'resolved' | 'discarded', resolved_in_meeting_id?: string }
// Access control: verify the advisor owns the client this deferred change belongs to.
router.patch("/:id", async (req, res) => {
  const { status, resolved_in_meeting_id } = req.body as {
    status?: string;
    resolved_in_meeting_id?: string;
  };

  if (status !== "resolved" && status !== "discarded") {
    return res.status(400).json({ error: "status must be 'resolved' or 'discarded'" });
  }

  try {
    // Fetch the deferred change row and its client_id for auth verification
    const dcRes = await query(
      `SELECT mdc.id, mdc.client_id, mdc.status
       FROM meeting_deferred_changes mdc
       WHERE mdc.id = $1`,
      [req.params.id]
    );

    if (dcRes.rows.length === 0) {
      return res.status(404).json({ error: "Deferred change not found" });
    }

    const dc = dcRes.rows[0] as { id: string; client_id: string; status: string };

    const ok = await verifyClientAccess(dc.client_id, req.user!.id, req.user!.role);
    if (!ok) {
      return res.status(404).json({ error: "Deferred change not found" });
    }

    if (dc.status !== "pending") {
      return res.status(409).json({ error: "Deferred change has already been resolved or discarded" });
    }

    const result = await query(
      `UPDATE meeting_deferred_changes
       SET status = $1,
           resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE NULL END,
           resolved_in_meeting_id = $2
       WHERE id = $3
       RETURNING *`,
      [status, resolved_in_meeting_id ?? null, req.params.id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /deferred-changes/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

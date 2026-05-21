import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/notifications — team members see all notifications
router.get("/", async (req, res) => {
  const isTeamMember = req.user!.role !== "client";
  try {
    const result = isTeamMember
      ? await query(
          `SELECT n.*, c.name AS client_name
           FROM notifications n
           LEFT JOIN clients c ON c.id = n.client_id
           ORDER BY n.read ASC, n.created_at DESC
           LIMIT 50`
        )
      : await query(
          `SELECT n.*, c.name AS client_name
           FROM notifications n
           LEFT JOIN clients c ON c.id = n.client_id
           WHERE n.advisor_id = $1
           ORDER BY n.read ASC, n.created_at DESC
           LIMIT 50`,
          [req.user!.id]
        );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /notifications error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/notifications/unread-count
router.get("/unread-count", async (req, res) => {
  const isTeamMember = req.user!.role !== "client";
  try {
    const result = isTeamMember
      ? await query(`SELECT COUNT(*)::int AS count FROM notifications WHERE read = FALSE`)
      : await query(
          `SELECT COUNT(*)::int AS count FROM notifications WHERE advisor_id = $1 AND read = FALSE`,
          [req.user!.id]
        );
    return res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error("GET /notifications/unread-count error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch("/:id/read", async (req, res) => {
  const isTeamMember = req.user!.role !== "client";
  try {
    const result = isTeamMember
      ? await query(
          `UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *`,
          [req.params.id]
        )
      : await query(
          `UPDATE notifications SET read = TRUE WHERE id = $1 AND advisor_id = $2 RETURNING *`,
          [req.params.id, req.user!.id]
        );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /notifications/:id/read error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch("/read-all", async (req, res) => {
  const isTeamMember = req.user!.role !== "client";
  try {
    if (isTeamMember) {
      await query(`UPDATE notifications SET read = TRUE WHERE read = FALSE`);
    } else {
      await query(
        `UPDATE notifications SET read = TRUE WHERE advisor_id = $1 AND read = FALSE`,
        [req.user!.id]
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /notifications/read-all error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/quarterly-review-check
// Finds clients assigned to the advisor whose quarterly review is exactly 14 days away
// and creates a notification if one hasn't already been sent this cycle.
router.post("/quarterly-review-check", async (req, res) => {
  if (req.user!.role === "client") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const advisorId = req.user!.id;
  try {
    const upcoming = await query(
      `SELECT qp.client_id, c.name AS client_name, c.advisor_id,
              qp.quarter, qp.year
       FROM quarterly_plans qp
       JOIN clients c ON c.id = qp.client_id
       WHERE c.advisor_id = $1
         AND qp.review_date = CURRENT_DATE + INTERVAL '14 days'
         AND qp.status != 'complete'`,
      [advisorId]
    );

    let created = 0;
    for (const plan of upcoming.rows) {
      const exists = await query(
        `SELECT 1 FROM notifications
         WHERE advisor_id = $1
           AND client_id = $2
           AND type = 'quarterly_review_reminder'
           AND created_at >= CURRENT_DATE - INTERVAL '20 days'
         LIMIT 1`,
        [plan.advisor_id, plan.client_id]
      );
      if (exists.rows.length === 0) {
        const message = `${plan.client_name}'s Q${plan.quarter} ${plan.year} review is in 14 days — time to prepare objectives.`;
        await query(
          `INSERT INTO notifications (advisor_id, client_id, type, message)
           VALUES ($1, $2, 'quarterly_review_reminder', $3)`,
          [plan.advisor_id, plan.client_id, message]
        );
        created++;
      }
    }

    return res.json({ created });
  } catch (err) {
    console.error("POST /notifications/quarterly-review-check error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

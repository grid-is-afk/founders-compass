import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/notifications — fetch all for current advisor, unread first
router.get("/", async (req, res) => {
  try {
    const result = await query(
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
  try {
    const result = await query(
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
  try {
    const result = await query(
      `UPDATE notifications SET read = TRUE
       WHERE id = $1 AND advisor_id = $2
       RETURNING *`,
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

// PATCH /api/notifications/read-all — mark all as read for this advisor
router.patch("/read-all", async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET read = TRUE WHERE advisor_id = $1 AND read = FALSE`,
      [req.user!.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /notifications/read-all error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

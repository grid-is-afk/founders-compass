import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/activity?client_id=xxx&limit=20
router.get("/", async (req, res) => {
  const { client_id, limit } = req.query;
  const rowLimit = Math.min(parseInt((limit as string) ?? "50"), 100);
  const isTeamMember = req.user!.role !== "client";

  try {
    let result;
    if (client_id) {
      // Team members can view any client's activity; clients verify ownership
      if (!isTeamMember) {
        const clientCheck = await query(
          "SELECT id FROM clients WHERE id = $1 AND advisor_id = $2",
          [client_id, req.user!.id]
        );
        if (clientCheck.rows.length === 0) {
          return res.status(404).json({ error: "Client not found" });
        }
      }

      result = await query(
        `SELECT al.*, c.name AS client_name
         FROM activity_log al
         LEFT JOIN clients c ON c.id = al.client_id
         WHERE al.client_id = $1
         ORDER BY al.created_at DESC
         LIMIT $2`,
        [client_id, rowLimit]
      );
    } else if (isTeamMember) {
      result = await query(
        `SELECT al.*, c.name AS client_name
         FROM activity_log al
         LEFT JOIN clients c ON c.id = al.client_id
         ORDER BY al.created_at DESC
         LIMIT $1`,
        [rowLimit]
      );
    } else {
      result = await query(
        `SELECT al.*, c.name AS client_name
         FROM activity_log al
         LEFT JOIN clients c ON c.id = al.client_id
         WHERE al.advisor_id = $1
         ORDER BY al.created_at DESC
         LIMIT $2`,
        [req.user!.id, rowLimit]
      );
    }

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /activity error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/activity
router.post("/", async (req, res) => {
  const { client_id, text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  const isTeamMember = req.user!.role !== "client";

  try {
    if (client_id && !isTeamMember) {
      const clientCheck = await query(
        "SELECT id FROM clients WHERE id = $1 AND advisor_id = $2",
        [client_id, req.user!.id]
      );
      if (clientCheck.rows.length === 0) {
        return res.status(404).json({ error: "Client not found" });
      }
    }

    const result = await query(
      `INSERT INTO activity_log (advisor_id, client_id, text)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user!.id, client_id ?? null, text]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /activity error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

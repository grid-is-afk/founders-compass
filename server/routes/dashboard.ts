import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/dashboard — aggregated overview for the advisor
router.get("/", async (req, res) => {
  const advisorId = req.user!.id;

  try {
    // Total clients
    const clientsResult = await query(
      "SELECT COUNT(*) AS total FROM clients WHERE advisor_id = $1",
      [advisorId]
    );

    // Clients by stage
    const stageResult = await query(
      `SELECT stage, COUNT(*) AS count
       FROM clients WHERE advisor_id = $1
       GROUP BY stage ORDER BY stage`,
      [advisorId]
    );

    // Active tasks across all clients
    const tasksResult = await query(
      `SELECT t.status, COUNT(*) AS count
       FROM tasks t
       JOIN clients c ON c.id = t.client_id
       WHERE c.advisor_id = $1
       GROUP BY t.status`,
      [advisorId]
    );

    // Unresolved risk alerts across all clients
    const riskResult = await query(
      `SELECT ra.severity, COUNT(*) AS count
       FROM risk_alerts ra
       JOIN clients c ON c.id = ra.client_id
       WHERE c.advisor_id = $1 AND ra.resolved = FALSE
       GROUP BY ra.severity`,
      [advisorId]
    );

    // Recent activity
    const activityResult = await query(
      `SELECT al.*, c.name AS client_name
       FROM activity_log al
       LEFT JOIN clients c ON c.id = al.client_id
       WHERE al.advisor_id = $1
       ORDER BY al.created_at DESC
       LIMIT 20`,
      [advisorId]
    );

    // Prospects by status
    const prospectsResult = await query(
      `SELECT status, COUNT(*) AS count
       FROM prospects WHERE advisor_id = $1
       GROUP BY status`,
      [advisorId]
    );

    // Average scores across all clients
    const scoresResult = await query(
      `SELECT
         ROUND(AVG(capital_readiness)) AS avg_capital_readiness,
         ROUND(AVG(customer_capital)) AS avg_customer_capital,
         ROUND(AVG(performance_score)) AS avg_performance_score
       FROM clients
       WHERE advisor_id = $1`,
      [advisorId]
    );

    return res.json({
      totalClients: parseInt(clientsResult.rows[0].total),
      clientsByStage: stageResult.rows,
      tasksByStatus: tasksResult.rows,
      riskAlertsBySeverity: riskResult.rows,
      recentActivity: activityResult.rows,
      prospectsByStatus: prospectsResult.rows,
      averageScores: scoresResult.rows[0],
    });
  } catch (err) {
    console.error("GET /dashboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

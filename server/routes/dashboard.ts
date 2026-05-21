import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/dashboard — aggregated overview
router.get("/", async (req, res) => {
  const advisorId = req.user!.id;
  const isTeamMember = req.user!.role !== "client";

  try {
    // Total clients
    const clientsResult = isTeamMember
      ? await query("SELECT COUNT(*) AS total FROM clients")
      : await query("SELECT COUNT(*) AS total FROM clients WHERE advisor_id = $1", [advisorId]);

    // Clients by stage
    const stageResult = isTeamMember
      ? await query(
          `SELECT stage, COUNT(*) AS count FROM clients GROUP BY stage ORDER BY stage`
        )
      : await query(
          `SELECT stage, COUNT(*) AS count FROM clients WHERE advisor_id = $1 GROUP BY stage ORDER BY stage`,
          [advisorId]
        );

    // Active tasks across all clients
    const tasksResult = isTeamMember
      ? await query(
          `SELECT t.status, COUNT(*) AS count
           FROM tasks t
           JOIN clients c ON c.id = t.client_id
           GROUP BY t.status`
        )
      : await query(
          `SELECT t.status, COUNT(*) AS count
           FROM tasks t
           JOIN clients c ON c.id = t.client_id
           WHERE c.advisor_id = $1
           GROUP BY t.status`,
          [advisorId]
        );

    // Unresolved risk alerts across all clients
    const riskResult = isTeamMember
      ? await query(
          `SELECT ra.severity, COUNT(*) AS count
           FROM risk_alerts ra
           JOIN clients c ON c.id = ra.client_id
           WHERE ra.resolved = FALSE
           GROUP BY ra.severity`
        )
      : await query(
          `SELECT ra.severity, COUNT(*) AS count
           FROM risk_alerts ra
           JOIN clients c ON c.id = ra.client_id
           WHERE c.advisor_id = $1 AND ra.resolved = FALSE
           GROUP BY ra.severity`,
          [advisorId]
        );

    // Recent activity — JOIN users to show actor name
    const activityResult = isTeamMember
      ? await query(
          `SELECT al.id, al.text AS action, al.created_at,
                  c.name AS client_name, u.name AS actor_name
           FROM activity_log al
           LEFT JOIN clients c ON c.id = al.client_id
           LEFT JOIN users u ON u.id = al.advisor_id
           ORDER BY al.created_at DESC
           LIMIT 20`
        )
      : await query(
          `SELECT al.id, al.text AS action, al.created_at,
                  c.name AS client_name, u.name AS actor_name
           FROM activity_log al
           LEFT JOIN clients c ON c.id = al.client_id
           LEFT JOIN users u ON u.id = al.advisor_id
           WHERE al.advisor_id = $1
           ORDER BY al.created_at DESC
           LIMIT 20`,
          [advisorId]
        );

    // Prospects by status
    const prospectsResult = isTeamMember
      ? await query(`SELECT status, COUNT(*) AS count FROM prospects GROUP BY status`)
      : await query(
          `SELECT status, COUNT(*) AS count FROM prospects WHERE advisor_id = $1 GROUP BY status`,
          [advisorId]
        );

    // Average scores across all clients
    const scoresResult = isTeamMember
      ? await query(
          `SELECT
             ROUND(AVG(capital_readiness)) AS avg_capital_readiness,
             ROUND(AVG(customer_capital)) AS avg_customer_capital,
             ROUND(AVG(performance_score)) AS avg_performance_score
           FROM clients`
        )
      : await query(
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

// GET /api/dashboard/priority-actions
router.get("/priority-actions", async (req, res) => {
  const advisorId = req.user!.id;
  const isTeamMember = req.user!.role !== "client";

  try {
    const clientFilter = isTeamMember ? "" : "AND c.advisor_id = $1";
    const params: unknown[] = isTeamMember ? [] : [advisorId];

    // Overdue tasks (due_date in the past, not complete)
    const overdueResult = await query(
      `SELECT t.id, t.title, t.due_date, t.status, t.priority,
              c.id AS client_id, c.name AS client_name,
              EXTRACT(DAY FROM NOW() - t.due_date) AS days_overdue
       FROM tasks t
       JOIN clients c ON c.id = t.client_id
       WHERE t.due_date IS NOT NULL
         AND t.due_date < NOW()
         AND t.status NOT IN ('complete', 'done', 'skipped')
         ${clientFilter}
       ORDER BY t.due_date ASC
       LIMIT 20`,
      params
    );

    // Clients with no meeting in 30+ days
    const silentResult = await query(
      `SELECT c.id AS client_id, c.name AS client_name,
              MAX(m.date) AS last_meeting
       FROM clients c
       LEFT JOIN meetings m ON m.client_id = c.id
       WHERE 1=1 ${clientFilter}
       GROUP BY c.id, c.name
       HAVING MAX(m.date) < NOW() - INTERVAL '30 days' OR MAX(m.date) IS NULL
       ORDER BY last_meeting ASC NULLS FIRST
       LIMIT 10`,
      params
    );

    const actions: Array<{
      id: string;
      type: string;
      label: string;
      client_id: string;
      client_name: string;
      severity: string;
      meta?: string;
    }> = [];

    for (const row of overdueResult.rows) {
      const days = Math.round(Number(row.days_overdue));
      actions.push({
        id: `overdue-${row.id}`,
        type: "overdue_task",
        label: `"${row.title}" is ${days} day${days !== 1 ? "s" : ""} overdue`,
        client_id: row.client_id,
        client_name: row.client_name,
        severity: days >= 21 ? "critical" : "warning",
        meta: `Due ${new Date(row.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      });
    }

    for (const row of silentResult.rows) {
      const label = row.last_meeting
        ? `No meeting in ${Math.round((Date.now() - new Date(row.last_meeting).getTime()) / 86400000)} days`
        : "No meetings logged yet";
      actions.push({
        id: `silent-${row.client_id}`,
        type: "no_meeting",
        label,
        client_id: row.client_id,
        client_name: row.client_name,
        severity: "warning",
      });
    }

    return res.json(actions);
  } catch (err) {
    console.error("GET /dashboard/priority-actions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/data-gaps
router.get("/data-gaps", async (req, res) => {
  const advisorId = req.user!.id;
  const isTeamMember = req.user!.role !== "client";

  try {
    const clientFilter = isTeamMember ? "" : "WHERE c.advisor_id = $1";
    const params: unknown[] = isTeamMember ? [] : [advisorId];

    const clientsResult = await query(
      `SELECT c.id, c.name FROM clients c ${clientFilter} ORDER BY c.name`,
      params
    );

    const gaps: Array<{
      client_id: string;
      client_name: string;
      gap: string;
      type: string;
    }> = [];

    for (const client of clientsResult.rows) {
      const cid = client.id;

      const [sixKeys, exposureIndex, founderMatrix, capitalOpt, docs] = await Promise.all([
        query("SELECT id FROM client_six_keys WHERE client_id = $1 LIMIT 1", [cid]),
        query("SELECT id FROM client_exposure_index WHERE client_id = $1 LIMIT 1", [cid]),
        query("SELECT id FROM client_founder_matrix WHERE client_id = $1 LIMIT 1", [cid]),
        query("SELECT id FROM client_capital_optionality WHERE client_id = $1 LIMIT 1", [cid]),
        query("SELECT id FROM documents WHERE client_id = $1 LIMIT 1", [cid]),
      ]);

      if (sixKeys.rows.length === 0)
        gaps.push({ client_id: cid, client_name: client.name, gap: "Six Keys not scored", type: "six_keys" });
      if (exposureIndex.rows.length === 0)
        gaps.push({ client_id: cid, client_name: client.name, gap: "Exposure Index not run", type: "exposure_index" });
      if (founderMatrix.rows.length === 0)
        gaps.push({ client_id: cid, client_name: client.name, gap: "Founder Matrix not completed", type: "founder_matrix" });
      if (capitalOpt.rows.length === 0)
        gaps.push({ client_id: cid, client_name: client.name, gap: "Capital Optionality not populated", type: "capital_optionality" });
      if (docs.rows.length === 0)
        gaps.push({ client_id: cid, client_name: client.name, gap: "No documents in Data Room", type: "documents" });
    }

    return res.json(gaps);
  } catch (err) {
    console.error("GET /dashboard/data-gaps error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/insurance
router.get("/insurance", async (req, res) => {
  const advisorId = req.user!.id;
  const isTeamMember = req.user!.role !== "client";

  try {
    const clientFilter = isTeamMember ? "" : "AND c.advisor_id = $1";
    const params: unknown[] = isTeamMember ? [] : [advisorId];

    const result = await query(
      `SELECT pi.id, pi.category, pi.label, pi.status, pi.risk, pi.recommendation,
              c.id AS client_id, c.name AS client_name
       FROM protection_items pi
       JOIN clients c ON c.id = pi.client_id
       WHERE 1=1 ${clientFilter}
       ORDER BY c.name, pi.category, pi.label`,
      params
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /dashboard/insurance error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";

const router = Router();

// POST /api/risk-scan/:clientId — run detection rules and upsert risk_alerts
router.post("/:clientId", async (req, res) => {
  const { clientId } = req.params;

  try {
    if (!(await verifyClientAccess(clientId, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    interface Detection {
      title: string;
      detail: string;
      severity: "critical" | "warning" | "info";
    }

    const detections: Detection[] = [];

    // Rule 1 & 2: Overdue tasks
    const overdueResult = await query(
      `SELECT id, title, due_date,
              EXTRACT(DAY FROM NOW() - due_date) AS days_overdue
       FROM tasks
       WHERE client_id = $1
         AND due_date IS NOT NULL
         AND due_date < NOW()
         AND status NOT IN ('complete', 'done', 'skipped')
       ORDER BY due_date ASC`,
      [clientId]
    );

    for (const t of overdueResult.rows) {
      const days = Math.round(Number(t.days_overdue));
      detections.push({
        title: `Task overdue: "${t.title}"`,
        detail: `[auto] Overdue by ${days} day${days !== 1 ? "s" : ""}. Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
        severity: days >= 21 ? "critical" : "warning",
      });
    }

    // Rule 3: No meeting in 30+ days
    const meetingResult = await query(
      `SELECT MAX(date) AS last_meeting FROM meetings WHERE client_id = $1`,
      [clientId]
    );
    const lastMeeting = meetingResult.rows[0]?.last_meeting;
    if (!lastMeeting) {
      detections.push({
        title: "No meetings logged",
        detail: "[auto] No meetings have been recorded for this client yet.",
        severity: "warning",
      });
    } else {
      const daysSince = Math.round((Date.now() - new Date(lastMeeting).getTime()) / 86400000);
      if (daysSince >= 30) {
        detections.push({
          title: `No meeting in ${daysSince} days`,
          detail: `[auto] Last meeting was ${new Date(lastMeeting).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Consider scheduling a check-in.`,
          severity: "warning",
        });
      }
    }

    // Rule 4: Blocked tasks with no resolution note
    const blockedResult = await query(
      `SELECT id, title FROM tasks
       WHERE client_id = $1
         AND status = 'blocked'
         AND (notes IS NULL OR TRIM(notes) = '')`,
      [clientId]
    );
    for (const t of blockedResult.rows) {
      detections.push({
        title: `Blocked task needs attention: "${t.title}"`,
        detail: "[auto] Task is marked blocked but has no resolution note or next step.",
        severity: "warning",
      });
    }

    // Rule 5: Quarter ending soon with low objective completion
    const quarterResult = await query(
      `SELECT qp.quarter, qp.review_date,
              COUNT(qph.id) AS total_phases,
              COUNT(CASE WHEN qph.status = 'complete' THEN 1 END) AS complete_phases
       FROM quarterly_plans qp
       LEFT JOIN quarterly_phases qph ON qph.plan_id = qp.id
       WHERE qp.client_id = $1 AND qp.status = 'active'
       GROUP BY qp.id, qp.quarter, qp.review_date
       LIMIT 1`,
      [clientId]
    );
    if (quarterResult.rows.length > 0) {
      const qr = quarterResult.rows[0];
      if (qr.review_date) {
        const daysToReview = Math.round(
          (new Date(qr.review_date).getTime() - Date.now()) / 86400000
        );
        const total = Number(qr.total_phases) || 0;
        const complete = Number(qr.complete_phases) || 0;
        const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
        if (daysToReview <= 14 && daysToReview >= 0 && pct < 50) {
          detections.push({
            title: `Q${qr.quarter} review in ${daysToReview} days — only ${pct}% complete`,
            detail: `[auto] ${complete} of ${total} phases done. Consider accelerating progress before the quarterly review.`,
            severity: "critical",
          });
        }
      }
    }

    // Clear previous auto-generated alerts, preserve manual ones
    await query(
      `DELETE FROM risk_alerts
       WHERE client_id = $1 AND detail LIKE '[auto]%'`,
      [clientId]
    );

    // Insert new detections
    for (const d of detections) {
      await query(
        `INSERT INTO risk_alerts (client_id, title, detail, severity)
         VALUES ($1, $2, $3, $4)`,
        [clientId, d.title, d.detail, d.severity]
      );
    }

    return res.json({ scanned: true, detections: detections.length });
  } catch (err) {
    console.error("POST /risk-scan error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

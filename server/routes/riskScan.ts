import { Router } from "express";
import pool, { query } from "../db.js";
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
      source_id?: string;
      source_type?: string;
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
      const dueDate = new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      detections.push({
        title: t.title,
        detail: `[auto] ${days} day${days !== 1 ? "s" : ""} overdue — Due ${dueDate}`,
        severity: days >= 21 ? "critical" : "warning",
        source_id: t.id,
        source_type: "task",
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
        title: t.title,
        detail: "[auto] Marked blocked — no resolution note or next step recorded.",
        severity: "warning",
        source_id: t.id,
        source_type: "task",
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

    // Rule 6: Orphan objectives — confirmed objective, 7+ days old, no supporting task.
    // (UC-07 added quarterly_objectives + tasks.objective_id; Katie: trigger "C — 7 days".)
    const orphanResult = await query(
      `SELECT qo.id, qo.title, qo.created_at
       FROM quarterly_objectives qo
       LEFT JOIN tasks t ON t.objective_id = qo.id
       WHERE qo.client_id = $1
         AND qo.status = 'confirmed'
         AND qo.created_at < NOW() - INTERVAL '7 days'
       GROUP BY qo.id, qo.title, qo.created_at
       HAVING COUNT(t.id) = 0`,
      [clientId]
    );
    for (const o of orphanResult.rows) {
      const days = Math.round((Date.now() - new Date(o.created_at).getTime()) / 86400000);
      detections.push({
        title: o.title,
        detail: `[auto] Confirmed objective has no supporting tasks ${days} days after creation — break it into tasks or drop it.`,
        severity: "warning",
        source_id: o.id,
        source_type: "objective",
      });
    }

    // Scope creep (UC-11): items added AFTER the founder approved the quarter's
    // plan — quarterly_plans.locked_at (set when a "Qn Review Prep" deliverable
    // hits client_approved). Tasks have no quarter column, so they use the active
    // quarter's lock; objectives are matched to their own quarter's lock.
    // Unlocked / unapproved quarters fire nothing. Deliverables are intentionally
    // not a creep vector — they're generated documents, not scope commitments.

    // Rule 7: tasks created after the active quarter was locked, no objective link.
    const activeLock = (
      await query(
        `SELECT locked_at FROM quarterly_plans
         WHERE client_id = $1 AND status = 'active' AND locked_at IS NOT NULL
         ORDER BY year DESC, quarter DESC
         LIMIT 1`,
        [clientId]
      )
    ).rows[0]?.locked_at;
    if (activeLock) {
      const creepTasks = Number(
        (
          await query(
            `SELECT COUNT(*)::int AS n FROM tasks
             WHERE client_id = $1
               AND objective_id IS NULL
               AND created_at > $2
               AND status NOT IN ('complete', 'done', 'skipped')`,
            [clientId, activeLock]
          )
        ).rows[0]?.n ?? 0
      );
      if (creepTasks > 0) {
        detections.push({
          title: `Scope creep — ${creepTasks} task${creepTasks !== 1 ? "s" : ""} added after the plan was locked`,
          detail: `[auto] ${creepTasks} active task${creepTasks !== 1 ? "s were" : " was"} added after the founder approved this quarter's plan, none tied to a confirmed objective. Confirm they belong in the agreed scope.`,
          severity: "warning",
        });
      }
    }

    // Rule 8: objectives created after THEIR quarter was locked.
    const creepObjResult = await query(
      `SELECT qo.id, qo.title
       FROM quarterly_objectives qo
       JOIN quarterly_plans qp
         ON qp.client_id = qo.client_id AND qp.quarter = qo.quarter AND qp.year = qo.year
       WHERE qo.client_id = $1
         AND qp.locked_at IS NOT NULL
         AND qo.created_at > qp.locked_at
         AND qo.status IN ('proposed', 'confirmed')`,
      [clientId]
    );
    for (const o of creepObjResult.rows) {
      detections.push({
        title: `Scope creep — objective added after lock: ${o.title}`,
        detail: `[auto] This objective was added after the founder approved the quarter's plan. Confirm it's an agreed addition, not unscoped work.`,
        severity: "warning",
        source_id: o.id,
        source_type: "objective",
      });
    }

    // TODO(UC-11): scope-creep "hour overages" vector is deferred — no hours/effort
    // column exists yet. It's blocked on the UC-08 capacity model (Katie must first
    // define how TFO measures advisor load). Build alongside UC-08, not here.

    // Rule 9: Advisor-flagged engagement — manual flag set on the client.
    const flag = (
      await query(
        `SELECT flagged_at, flagged_reason FROM clients WHERE id = $1`,
        [clientId]
      )
    ).rows[0];
    if (flag?.flagged_at) {
      const reason = (flag.flagged_reason ?? "").trim();
      detections.push({
        title: "Engagement flagged for follow-up",
        detail: `[auto] An advisor flagged this engagement${reason ? `: ${reason}` : "."}`,
        severity: "warning",
      });
    }

    // Rule 10: Missed deliverable promises — past due_date, not yet delivered.
    const promiseResult = await query(
      `SELECT id, title, due_date FROM deliverables
       WHERE client_id = $1
         AND archived_at IS NULL
         AND due_date IS NOT NULL
         AND due_date < CURRENT_DATE
         AND status NOT IN ('complete', 'ready')`,
      [clientId]
    );
    for (const d of promiseResult.rows) {
      const days = Math.round((Date.now() - new Date(d.due_date).getTime()) / 86400000);
      detections.push({
        title: d.title,
        detail: `[auto] Deliverable is ${days} day${days !== 1 ? "s" : ""} past its promised date and not yet delivered.`,
        severity: days >= 14 ? "critical" : "warning",
        source_id: d.id,
        source_type: "deliverable",
      });
    }

    // TODO(UC-11): "sentiment decline" signal is deferred — no sentiment is captured.
    // A real version needs an AI pass scoring recent meeting notes against a baseline;
    // that's its own slice, not a riskScan rule.

    // Swap the auto-alert set atomically: clear the previous '[auto]' alerts
    // (manual ones are preserved) and insert the fresh detections in one
    // transaction, so a single failed insert can never leave the client with
    // a half-written or empty alert list.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM risk_alerts WHERE client_id = $1 AND detail LIKE '[auto]%'`,
        [clientId]
      );
      for (const d of detections) {
        await client.query(
          `INSERT INTO risk_alerts (client_id, title, detail, severity, source_id, source_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [clientId, d.title, d.detail, d.severity, d.source_id ?? null, d.source_type ?? null]
        );
      }
      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return res.json({ scanned: true, detections: detections.length });
  } catch (err) {
    console.error("POST /risk-scan error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

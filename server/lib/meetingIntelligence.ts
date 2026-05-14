import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AgendaItem {
  text: string;
  source?: string;
}

export interface AgendaSection {
  title: string;
  items: AgendaItem[];
}

export interface ExistingTaskSnapshot {
  id: string;
  title: string;
  status: string;
  phase: string | null;
  notes: string | null;
  due_date: string | null;
  assignee_name: string | null;
}

export interface ProposedChange {
  type: "new_task" | "task_update" | "decision" | "open_question";
  title: string;
  detail: string;
  source_excerpt?: string;
  source_timestamp?: string;
  suggested_assignee?: string;
  suggested_due_date?: string;
  suggested_phase?: string;
  suggested_dependencies?: string;
  existing_task_id?: string;
  existing_task_snapshot?: ExistingTaskSnapshot;
  confidence: "high" | "medium" | "low";
}

export interface CaptureResult {
  summary: string;
  proposed_changes: ProposedChange[];
}

// ---------------------------------------------------------------------------
// UC-01: Generate pre-meeting agenda from client context
// ---------------------------------------------------------------------------
export async function generateAgenda(
  meetingId: string,
  clientId: string,
  advisorId: string
): Promise<AgendaSection[]> {
  const [meetingRes, tasksRes, plansRes, recentMeetingsRes, riskRes, activityRes] =
    await Promise.all([
      query(`SELECT * FROM meetings WHERE id = $1`, [meetingId]),
      query(
        `SELECT t.title, t.status, t.priority, t.due_date, t.phase, t.notes, u.name AS assignee_name
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_id
         WHERE t.client_id = $1
           AND t.status NOT IN ('done', 'skipped')
         ORDER BY
           CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           t.due_date ASC NULLS LAST
         LIMIT 30`,
        [clientId]
      ),
      query(
        `SELECT qp.quarter, qp.year, qp.label, qp.status,
                json_agg(json_build_object(
                  'phase', qph.phase, 'label', qph.label, 'status', qph.status,
                  'completed', qph.completed_tasks, 'total', qph.total_tasks
                ) ORDER BY qph.sort_order) AS phases
         FROM quarterly_plans qp
         LEFT JOIN quarterly_phases qph ON qph.plan_id = qp.id
         WHERE qp.client_id = $1
         GROUP BY qp.id
         ORDER BY qp.year DESC, qp.quarter DESC
         LIMIT 1`,
        [clientId]
      ),
      query(
        `SELECT type, date, notes FROM meetings
         WHERE client_id = $1 AND id != $2
           AND date < NOW()
         ORDER BY date DESC LIMIT 3`,
        [clientId, meetingId]
      ),
      query(
        `SELECT title, detail, severity FROM risk_alerts
         WHERE client_id = $1 AND resolved = false
         ORDER BY created_at DESC LIMIT 5`,
        [clientId]
      ),
      query(
        `SELECT text FROM activity_log
         WHERE client_id = $1
         ORDER BY created_at DESC LIMIT 10`,
        [clientId]
      ),
    ]);

  const meeting = meetingRes.rows[0];
  const tasks = tasksRes.rows;
  const plan = plansRes.rows[0];
  const recentMeetings = recentMeetingsRes.rows;
  const risks = riskRes.rows;
  const activity = activityRes.rows;

  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date()
  );
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  const context = `
You are preparing a pre-meeting agenda for a TFO (The Founders Office) advisory session.

MEETING DETAILS:
Type: ${meeting?.type ?? "Client Meeting"}
Date: ${meeting?.date ? new Date(meeting.date).toLocaleDateString() : "Upcoming"}

QUARTERLY PLAN STATUS:
${
  plan
    ? `Q${plan.quarter} ${plan.year}${plan.label ? ` — ${plan.label}` : ""} (${plan.status})
${(plan.phases as Array<{ phase: string; label: string; status: string; completed: number; total: number }> | null)
  ?.map((p) => `  • ${p.label}: ${p.completed}/${p.total} tasks (${p.status})`)
  .join("\n") ?? "No phases"}`
    : "No active quarterly plan."
}

OPEN TASKS (${tasks.length} total):
Overdue (${overdueTasks.length}):
${overdueTasks.map((t) => `  • [OVERDUE] ${t.title} — ${t.assignee_name ?? "Unassigned"} — due ${new Date(t.due_date).toLocaleDateString()}`).join("\n") || "  None"}

Blocked (${blockedTasks.length}):
${blockedTasks.map((t) => `  • [BLOCKED] ${t.title} — ${t.notes ?? ""}`).join("\n") || "  None"}

In Progress (${inProgressTasks.length}):
${inProgressTasks.map((t) => `  • ${t.title} — ${t.assignee_name ?? "Unassigned"}`).join("\n") || "  None"}

RISK ALERTS:
${risks.map((r) => `  • [${r.severity.toUpperCase()}] ${r.title}: ${r.detail}`).join("\n") || "  None"}

RECENT MEETINGS & NOTES:
${
  recentMeetings
    .map(
      (m) =>
        `  ${new Date(m.date).toLocaleDateString()} (${m.type ?? "Meeting"}): ${m.notes?.slice(0, 200) ?? "No notes"}`
    )
    .join("\n") || "  No prior meeting notes."
}

RECENT ACTIVITY:
${activity.map((a) => `  • ${a.text}`).join("\n") || "  No recent activity."}

INSTRUCTIONS:
Generate a structured meeting agenda with exactly these 5 sections (in this order):
1. Client Updates & Requests — items the client likely wants to raise; infer from recent activity, notes, and communications.
2. Outstanding Commitments Review — overdue tasks, blocked tasks, and open items from prior meeting notes that haven't been resolved.
3. Workplan Status — progress summary by phase: what's on track, what's slipping, what just completed.
4. Methodology-Aligned Topics — based on the current quarterly phase, identify TFO methodology activities that are due, missing, or should be advanced this meeting. Reference the Capital Alignment Method phases (Prove, Diagnose, Design TFO, Protect, Grow, Align) and flag what should be happening now.
5. Forward-Looking Decisions — risk alerts, items where the advisor or client needs to make a decision or take a position before the next meeting.

Rules:
- 2–5 items per section. Be specific and actionable — reference real task names, real dates, real risk titles from the context above.
- For EVERY item, include a brief "source" note (one sentence max) that explains why this item is on the agenda — e.g. "From overdue task: Finalize LOI", "From risk alert: Cash runway < 90 days", "From prior meeting note (May 9): client mentioned X", "Methodology: Diagnose phase requires completion of FBI instrument".
- Never generate generic filler like "Review progress" without a specific reference.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
[
  {
    "title": "Client Updates & Requests",
    "items": [
      { "text": "...", "source": "From activity: ..." }
    ]
  },
  {
    "title": "Outstanding Commitments Review",
    "items": [
      { "text": "...", "source": "From overdue task: ..." }
    ]
  },
  {
    "title": "Workplan Status",
    "items": [
      { "text": "...", "source": "From quarterly plan: ..." }
    ]
  },
  {
    "title": "Methodology-Aligned Topics",
    "items": [
      { "text": "...", "source": "Methodology: ..." }
    ]
  },
  {
    "title": "Forward-Looking Decisions",
    "items": [
      { "text": "...", "source": "From risk alert: ..." }
    ]
  }
]
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    messages: [{ role: "user", content: context }],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "[]";

  try {
    const parsed = JSON.parse(rawText) as AgendaSection[];
    return parsed;
  } catch {
    return [
      {
        title: "Client Updates & Requests",
        items: [{ text: "Review client updates since last meeting", source: "Inferred from recent activity" }],
      },
      {
        title: "Outstanding Commitments Review",
        items: overdueTasks.slice(0, 3).map((t) => ({
          text: `Review status: ${t.title}`,
          source: `From overdue task assigned to ${t.assignee_name ?? "unassigned"}`,
        })),
      },
      {
        title: "Workplan Status",
        items: [{ text: "Review quarterly plan progress", source: "From quarterly plan status" }],
      },
      {
        title: "Methodology-Aligned Topics",
        items: [{ text: "Review current TFO methodology phase requirements", source: "TFO Capital Alignment Method" }],
      },
      {
        title: "Forward-Looking Decisions",
        items: risks.slice(0, 2).map((r) => ({
          text: `Address: ${r.title}`,
          source: `From risk alert [${r.severity}]: ${r.detail ?? ""}`,
        })),
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// UC-03: Process meeting notes/transcript and extract proposed changes
// ---------------------------------------------------------------------------
export async function captureMeeting(
  clientId: string,
  notes: string,
  advisorId: string
): Promise<CaptureResult> {
  const [tasksRes, teamRes, planRes] = await Promise.all([
    query(
      `SELECT t.id, t.title, t.status, t.phase, t.notes, t.due_date, u.name AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.client_id = $1
         AND t.status NOT IN ('done', 'skipped')
       LIMIT 50`,
      [clientId]
    ),
    query(
      `SELECT id, name FROM users WHERE role IN ('advisor', 'admin') ORDER BY name`
    ),
    query(
      `SELECT qp.quarter, qp.year,
              json_agg(json_build_object('phase', qph.phase, 'label', qph.label, 'status', qph.status) ORDER BY qph.sort_order) AS phases
       FROM quarterly_plans qp
       LEFT JOIN quarterly_phases qph ON qph.plan_id = qp.id
       WHERE qp.client_id = $1
       GROUP BY qp.id
       ORDER BY qp.year DESC, qp.quarter DESC
       LIMIT 1`,
      [clientId]
    ),
  ]);

  const existingTasks = tasksRes.rows as Array<{
    id: string; title: string; status: string; phase: string | null;
    notes: string | null; due_date: string | null; assignee_name: string | null;
  }>;
  const teamMembers = teamRes.rows as Array<{ id: string; name: string }>;
  const plan = planRes.rows[0];
  const phases = (plan?.phases as Array<{ phase: string; label: string; status: string }> | null)?.filter((p) => p.phase) ?? [];
  const phaseLabels = phases.map((p) => `${p.phase} (${p.label ?? p.phase}, ${p.status})`).join(", ");

  const context = `
You are a TFO (The Founders Office) advisory assistant processing notes from a client meeting.
Today's date: ${new Date().toISOString().split("T")[0]}

CURRENT QUARTERLY PLAN PHASES (use these exact phase values in suggested_phase):
${phaseLabels || "No active quarterly plan phases."}

EXISTING OPEN TASKS:
${existingTasks.map((t) => `  [ID: ${t.id}] "${t.title}" — status: ${t.status}, phase: ${t.phase ?? "none"}, assignee: ${t.assignee_name ?? "unassigned"}, due: ${t.due_date ?? "none"}`).join("\n") || "  No open tasks."}

TEAM MEMBERS (use exact names for assignee suggestions):
${teamMembers.map((m) => m.name).join(", ")}

MEETING NOTES / TRANSCRIPT:
${notes}

INSTRUCTIONS:
Analyze the meeting notes and extract:
1. A concise summary (2–4 sentences) of what was discussed and decided.
2. Proposed workplan changes, classified as one of:
   - new_task: a new action item to add to the workplan
   - task_update: an update to an existing task (must match an ID above)
   - decision: a decision recorded (no workplan action needed)
   - open_question: something unresolved — ESPECIALLY use this when a commitment is mentioned but has no concrete owner or no due date

For new_task items:
- suggested_assignee: exact name from team list, or null
- suggested_due_date: ISO date YYYY-MM-DD, or null
- suggested_phase: must exactly match one of the phase values above (e.g. "discover"), or null
- suggested_dependencies: brief note if this task depends on another (e.g. "Depends on: Finalize LOI"), or null
- source_excerpt: the exact sentence(s) from the notes this came from
- source_timestamp: if the notes contain a timestamp near this excerpt (e.g. "[00:05:32]"), include it; otherwise null

For task_update items:
- existing_task_id: UUID from the task list above
- detail: what specifically is changing (status, new info, blocker removed, etc.)
- source_excerpt and source_timestamp: same as above

For open_question items (missing owner/date):
- Use confidence "low"
- detail: explain what's missing, e.g. "Commitment mentioned but no owner assigned" or "Action item has no due date"

Rate confidence:
- high: explicitly stated, clear owner AND date
- medium: implied or partially specified
- low: ambiguous, vague, or missing owner/date

Return ONLY valid JSON (no markdown):
{
  "summary": "...",
  "proposed_changes": [
    {
      "type": "new_task",
      "title": "...",
      "detail": "...",
      "source_excerpt": "...",
      "source_timestamp": "00:05:32 or null",
      "suggested_assignee": "Name or null",
      "suggested_due_date": "YYYY-MM-DD or null",
      "suggested_phase": "discover or null",
      "suggested_dependencies": "Depends on: X or null",
      "confidence": "high"
    },
    {
      "type": "task_update",
      "title": "Update: ...",
      "detail": "What is changing: ...",
      "source_excerpt": "...",
      "source_timestamp": null,
      "existing_task_id": "uuid",
      "confidence": "high"
    },
    {
      "type": "decision",
      "title": "...",
      "detail": "...",
      "source_excerpt": "...",
      "source_timestamp": null,
      "confidence": "high"
    },
    {
      "type": "open_question",
      "title": "...",
      "detail": "Commitment mentioned but no owner assigned",
      "source_excerpt": "...",
      "source_timestamp": null,
      "confidence": "low"
    }
  ]
}
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    messages: [{ role: "user", content: context }],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    // Strip markdown code fences Claude sometimes adds despite instructions
    const cleanText = rawText
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```$/m, "")
      .trim();

    const result = JSON.parse(cleanText) as CaptureResult;

    // Gap 3: Enrich task_update changes with a snapshot of the existing task
    for (const change of result.proposed_changes) {
      if (change.type === "task_update" && change.existing_task_id) {
        const existing = existingTasks.find((t) => t.id === change.existing_task_id);
        if (existing) {
          change.existing_task_snapshot = {
            id: existing.id,
            title: existing.title,
            status: existing.status,
            phase: existing.phase,
            notes: existing.notes,
            due_date: existing.due_date,
            assignee_name: existing.assignee_name,
          };
        }
      }
    }

    return result;
  } catch {
    return {
      summary: "Unable to parse meeting notes. Please review manually.",
      proposed_changes: [],
    };
  }
}

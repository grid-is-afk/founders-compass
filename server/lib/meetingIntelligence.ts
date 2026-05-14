import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AgendaSection {
  title: string;
  items: string[];
}

export interface ProposedChange {
  type: "new_task" | "task_update" | "decision" | "open_question";
  title: string;
  detail: string;
  source_excerpt?: string;
  suggested_assignee?: string;
  suggested_due_date?: string;
  suggested_phase?: string;
  existing_task_id?: string;
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
Generate a structured meeting agenda with exactly these sections (in this order):
1. Client Updates & Requests — items the client likely wants to raise (infer from recent activity and notes)
2. Outstanding Commitments Review — overdue and blocked tasks, open items from prior meetings
3. Workplan Status — progress summary, what's on track, what needs attention
4. Forward-Looking Decisions — risk alerts, items needing advisor or client decisions

For each section, provide 2–5 bullet point agenda items. Be specific and actionable, not generic.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
[
  { "title": "Client Updates & Requests", "items": ["...", "..."] },
  { "title": "Outstanding Commitments Review", "items": ["...", "..."] },
  { "title": "Workplan Status", "items": ["...", "..."] },
  { "title": "Forward-Looking Decisions", "items": ["...", "..."] }
]
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: context }],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "[]";

  try {
    const parsed = JSON.parse(rawText) as AgendaSection[];
    return parsed;
  } catch {
    // If JSON parse fails, return a safe fallback
    return [
      {
        title: "Client Updates & Requests",
        items: ["Review client updates since last meeting"],
      },
      {
        title: "Outstanding Commitments Review",
        items: overdueTasks.slice(0, 3).map((t) => `Review status: ${t.title}`),
      },
      { title: "Workplan Status", items: ["Review quarterly plan progress"] },
      {
        title: "Forward-Looking Decisions",
        items: risks.slice(0, 2).map((r) => `Address: ${r.title}`),
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
  const [tasksRes, teamRes] = await Promise.all([
    query(
      `SELECT t.id, t.title, t.status, t.phase, u.name AS assignee_name
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
  ]);

  const existingTasks = tasksRes.rows;
  const teamMembers = teamRes.rows;

  const context = `
You are a TFO (The Founders Office) advisory assistant processing notes from a client meeting.

EXISTING OPEN TASKS (for reference when proposing updates):
${existingTasks.map((t) => `  [ID: ${t.id}] ${t.title} (${t.status}, phase: ${t.phase ?? "none"}, assignee: ${t.assignee_name ?? "unassigned"})`).join("\n") || "  No open tasks."}

TEAM MEMBERS (for assignee suggestions):
${teamMembers.map((m) => `  ${m.name} (id: ${m.id})`).join("\n")}

MEETING NOTES / TRANSCRIPT:
${notes}

INSTRUCTIONS:
Analyze the meeting notes above and extract:
1. A concise summary (2–4 sentences) of what was discussed.
2. Proposed workplan changes, classified as:
   - new_task: a new action item to add to the workplan
   - task_update: an update to an existing task (reference its ID from the list above)
   - decision: a decision recorded (no workplan change needed)
   - open_question: something unresolved that needs follow-up

For new_task items:
- Suggest an assignee (from the team list), a due date (use ISO format, relative to today ${new Date().toISOString().split("T")[0]}), and a phase (discover/grow/strengthen/elevate or null)
- Extract the specific source excerpt from the notes

For task_update items:
- Reference the existing_task_id from the task list above
- Describe what changed (status, notes, etc.)

Rate confidence as:
- high: explicitly stated with clear owner/date
- medium: implied or inferred
- low: ambiguous or speculative

Return ONLY valid JSON (no markdown, no explanation):
{
  "summary": "...",
  "proposed_changes": [
    {
      "type": "new_task",
      "title": "...",
      "detail": "...",
      "source_excerpt": "...",
      "suggested_assignee": "Name or null",
      "suggested_due_date": "YYYY-MM-DD or null",
      "suggested_phase": "discover or null",
      "confidence": "high"
    },
    {
      "type": "task_update",
      "title": "Update: ...",
      "detail": "...",
      "source_excerpt": "...",
      "existing_task_id": "uuid",
      "confidence": "high"
    },
    {
      "type": "decision",
      "title": "...",
      "detail": "...",
      "source_excerpt": "...",
      "confidence": "high"
    }
  ]
}
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: context }],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    return JSON.parse(rawText) as CaptureResult;
  } catch {
    return {
      summary: "Unable to parse meeting notes. Please review manually.",
      proposed_changes: [],
    };
  }
}

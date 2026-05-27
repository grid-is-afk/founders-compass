import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AgendaItem {
  text: string;
  source?: string;
  stakeholders?: string[];
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

export interface ProposedSignal {
  stakeholder_id: string;
  stakeholder_name: string;
  signal_type: "meeting_mention" | "sentiment";
  sentiment?: "positive" | "neutral" | "negative" | "at_risk";
  value: string;
  source_excerpt: string;
  confidence: "high" | "medium" | "low";
}

export interface CaptureResult {
  summary: string;
  proposed_changes: ProposedChange[];
  proposed_signals: ProposedSignal[];
}

// ---------------------------------------------------------------------------
// UC-01: Generate pre-meeting agenda from client context
// ---------------------------------------------------------------------------
export async function generateAgenda(
  meetingId: string,
  clientId: string,
  advisorId: string
): Promise<AgendaSection[]> {
  const [meetingRes, tasksRes, plansRes, recentMeetingsRes, riskRes, activityRes, deferredRes, stakeholdersRes] =
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
      query(
        `SELECT mdc.id, mdc.change_payload, mdc.created_at,
                m.date AS source_meeting_date, m.type AS source_meeting_type
         FROM meeting_deferred_changes mdc
         JOIN meetings m ON m.id = mdc.source_meeting_id
         WHERE mdc.client_id = $1 AND mdc.status = 'pending'
           AND mdc.source_meeting_id != $2
         ORDER BY mdc.created_at DESC LIMIT 10`,
        [clientId, meetingId]
      ),
      query(
        `SELECT s.id, s.name, s.role, s.tier, s.current_sentiment,
                (SELECT json_agg(sig_row ORDER BY sig_row_ts DESC)
                 FROM (
                   SELECT json_build_object(
                     'type', sig.signal_type, 'value', sig.value,
                     'sentiment', sig.sentiment, 'ts', sig.ts
                   ) AS sig_row,
                   sig.ts AS sig_row_ts
                   FROM stakeholder_signals sig
                   WHERE sig.stakeholder_id = s.id
                   ORDER BY sig.ts DESC
                   LIMIT 5
                 ) sub
                ) AS recent_signals
         FROM stakeholders s
         WHERE s.client_id = $1
         ORDER BY
           CASE s.tier WHEN 'primary' THEN 0 WHEN 'secondary' THEN 1 ELSE 2 END,
           s.name`,
        [clientId]
      ),
    ]);

  const meeting = meetingRes.rows[0];
  const tasks = tasksRes.rows;
  const plan = plansRes.rows[0];
  const recentMeetings = recentMeetingsRes.rows;
  const risks = riskRes.rows;
  const activity = activityRes.rows;
  const deferredItems = deferredRes.rows as Array<{
    id: string;
    change_payload: ProposedChange;
    created_at: string;
    source_meeting_date: string | null;
    source_meeting_type: string | null;
  }>;
  const stakeholders = stakeholdersRes.rows as Array<{
    id: string;
    name: string;
    role: string | null;
    tier: string;
    current_sentiment: string | null;
    recent_signals: Array<{
      type: string;
      value: string | null;
      sentiment: string | null;
      ts: string;
    }> | null;
  }>;

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

DEFERRED ITEMS FROM PRIOR MEETINGS (${deferredItems.length}):
${
  deferredItems.length > 0
    ? deferredItems
        .map((d) => {
          const payload = d.change_payload;
          const meetingDate = d.source_meeting_date
            ? new Date(d.source_meeting_date).toLocaleDateString()
            : "Unknown date";
          const meetingType = d.source_meeting_type ?? "Meeting";
          return `  • [DEFERRED from ${meetingType} ${meetingDate}] ${payload.title}: ${payload.detail ?? ""}`;
        })
        .join("\n")
    : "  None"
}

STAKEHOLDERS (${stakeholders.length}):
${
  stakeholders.length > 0
    ? stakeholders
        .map((s) => {
          const sentimentLabel = s.current_sentiment ? ` | sentiment: ${s.current_sentiment}` : "";
          const signalLines =
            s.recent_signals && s.recent_signals.length > 0
              ? s.recent_signals
                  .map((sig) => {
                    const date = new Date(sig.ts).toLocaleDateString();
                    const detail = sig.sentiment ? `${sig.type} (${sig.sentiment}): ${sig.value ?? ""}` : `${sig.type}: ${sig.value ?? ""}`;
                    return `    - [${date}] ${detail}`;
                  })
                  .join("\n")
              : "    - No recent signals";
          return `  • ${s.name} (${s.role ?? "unknown role"}, ${s.tier})${sentimentLabel}\n${signalLines}`;
        })
        .join("\n")
    : "  No stakeholders recorded."
}

INSTRUCTIONS:
Generate a structured meeting agenda with exactly these 5 sections (in this order):
1. Client Updates & Requests — items the client likely wants to raise; infer from recent activity, notes, and communications.
2. Outstanding Commitments Review — overdue tasks, blocked tasks, open items from prior meeting notes that haven't been resolved, and any deferred items from prior meetings (listed above under DEFERRED ITEMS FROM PRIOR MEETINGS).
3. Workplan Status — progress summary by phase: what's on track, what's slipping, what just completed.
4. Methodology-Aligned Topics — based on the current quarterly phase, identify TFO methodology activities that are due, missing, or should be advanced this meeting. Reference the Capital Alignment Method phases (Prove, Diagnose, Design TFO, Protect, Grow, Align) and flag what should be happening now.
5. Forward-Looking Decisions — risk alerts, items where the advisor or client needs to make a decision or take a position before the next meeting.

Rules:
- 2–5 items per section. Be specific and actionable — reference real task names, real dates, real risk titles from the context above.
- For EVERY item, include a brief "source" note (one sentence max) that explains why this item is on the agenda — e.g. "From overdue task: Finalize LOI", "From risk alert: Cash runway < 90 days", "From prior meeting note (May 9): client mentioned X", "Methodology: Diagnose phase requires completion of FBI instrument".
- Never generate generic filler like "Review progress" without a specific reference.
- When a stakeholder appears in recent meeting notes or activity, OR has a "negative" or "at_risk" sentiment, surface them by name in the relevant agenda item's source (e.g. "From recent signal: Priya flagged concerns about runway"). For each item, populate "stakeholders" with an array of the stakeholder names referenced. If no stakeholders are relevant to an item, omit the field or use an empty array.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
[
  {
    "title": "Client Updates & Requests",
    "items": [
      { "text": "...", "source": "From activity: ...", "stakeholders": ["Name"] }
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
      { "text": "...", "source": "From risk alert: ...", "stakeholders": ["Name 1", "Name 2"] }
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
  const [tasksRes, teamRes, planRes, captureStakeholdersRes] = await Promise.all([
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
    query(
      `SELECT id, name, role, tier FROM stakeholders WHERE client_id = $1 ORDER BY name`,
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
  const captureStakeholders = captureStakeholdersRes.rows as Array<{
    id: string;
    name: string;
    role: string | null;
    tier: string;
  }>;
  // Build a lookup set for fast ID validation when filtering Claude's output
  const stakeholderIdSet = new Set(captureStakeholders.map((s) => s.id));

  const context = `
You are a TFO (The Founders Office) advisory assistant processing notes from a client meeting.
Today's date: ${new Date().toISOString().split("T")[0]}

CURRENT QUARTERLY PLAN PHASES (use these exact phase values in suggested_phase):
${phaseLabels || "No active quarterly plan phases."}

EXISTING OPEN TASKS:
${existingTasks.map((t) => `  [ID: ${t.id}] "${t.title}" — status: ${t.status}, phase: ${t.phase ?? "none"}, assignee: ${t.assignee_name ?? "unassigned"}, due: ${t.due_date ?? "none"}`).join("\n") || "  No open tasks."}

TEAM MEMBERS (use exact names for assignee suggestions):
${teamMembers.map((m) => m.name).join(", ")}

KNOWN STAKEHOLDERS (use exact IDs and names for proposed_signals — do NOT invent stakeholders not in this list):
${
  captureStakeholders.length > 0
    ? captureStakeholders.map((s) => `  [ID: ${s.id}] ${s.name} — ${s.role ?? "unknown role"} (${s.tier})`).join("\n")
    : "  No stakeholders recorded for this client."
}

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

CRITICAL — avoid duplicate tasks:
Before classifying any item as new_task, scan the EXISTING OPEN TASKS list above. If your proposed action semantically matches an existing task — even if the wording differs (e.g., "Tom will draft the LOI" matches existing task "Finalize LOI for Acme acquisition") — use type "task_update" with that task's existing_task_id, NOT new_task. The match does not need to be word-for-word; match on intent and subject. When in doubt between new_task and task_update, prefer task_update. This is especially important when the advisor is re-capturing a meeting that has already been processed once.

For new_task items:
- suggested_assignee: exact name from team list, or null
- suggested_due_date: ISO date YYYY-MM-DD, or null
- suggested_phase: must exactly match one of the phase values above (e.g. "discover"). Capitalize it to match the roadmap domain tabs: "Discover", "Protect", "Grow", "Prove & Align", or null
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

For proposed_signals, extract two types:
- meeting_mention: emit for every stakeholder named in the notes (even briefly). value = brief description of the mention context.
- sentiment: emit ONLY when explicit emotional tone is detectable for that person (e.g. "frustrated", "excited", "concerned"). sentiment field must be one of: positive, neutral, negative, at_risk. Prefer negative for frustration/concern and at_risk for serious red flags.
- CRITICAL: only reference stakeholders from the KNOWN STAKEHOLDERS list above. Use the exact stakeholder_id UUID. Never invent a stakeholder not in the list.

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
  ],
  "proposed_signals": [
    {
      "stakeholder_id": "uuid-from-known-stakeholders-list",
      "stakeholder_name": "Name",
      "signal_type": "meeting_mention",
      "value": "Brief description of mention context",
      "source_excerpt": "Exact quote from notes",
      "confidence": "high"
    },
    {
      "stakeholder_id": "uuid-from-known-stakeholders-list",
      "stakeholder_name": "Name",
      "signal_type": "sentiment",
      "sentiment": "negative",
      "value": "Seemed frustrated about the Q3 delay",
      "source_excerpt": "Exact quote showing emotional cue",
      "confidence": "medium"
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

    // Ensure proposed_signals always exists as an array (Claude may omit it)
    if (!Array.isArray(result.proposed_signals)) {
      result.proposed_signals = [];
    }

    // Defensive guard: filter out any signals whose stakeholder_id is not in
    // the queried stakeholders list (Claude sometimes invents IDs)
    result.proposed_signals = result.proposed_signals.filter(
      (sig) => typeof sig.stakeholder_id === "string" && stakeholderIdSet.has(sig.stakeholder_id)
    );

    // De-dupe: when a sentiment signal exists for the same stakeholder + source_excerpt,
    // drop the redundant meeting_mention. Sentiment implies mention, so reviewing both
    // forces the advisor to approve the same evidence twice.
    const sentimentExcerpts = new Set(
      result.proposed_signals
        .filter((s) => s.signal_type === "sentiment")
        .map((s) => `${s.stakeholder_id}::${s.source_excerpt}`)
    );
    result.proposed_signals = result.proposed_signals.filter((s) => {
      if (s.signal_type !== "meeting_mention") return true;
      return !sentimentExcerpts.has(`${s.stakeholder_id}::${s.source_excerpt}`);
    });

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
      proposed_signals: [],
    };
  }
}

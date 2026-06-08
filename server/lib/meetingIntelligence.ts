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

// UC-03: advisor-facing task priority. Date-driven default (see
// derivePriorityFromDueDate), overridable by the advisor in the capture panel.
// Kept to low/med/high per Katie 06.02; the tasks table also allows 'urgent'
// but capture never sets it.
export type TaskPriority = "low" | "medium" | "high";

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
  /** UC-03: date-driven priority (≤7 days out = high), advisor-overridable. */
  priority?: TaskPriority;
  /**
   * UC-12: who is on the hook for this commitment.
   * 'tfo' (default) → a TFO team member owns it (suggested_assignee).
   * 'client' → a named client stakeholder owns it (owner_stakeholder_id).
   */
  owner_type?: "tfo" | "client";
  /** UC-12: stakeholder UUID from the KNOWN STAKEHOLDERS list, when owner_type='client'. */
  owner_stakeholder_id?: string | null;
  /** UC-12: display name for the owning stakeholder (advisor convenience). */
  owner_stakeholder_name?: string | null;
}

// UC-03: deterministic date → priority. An item needed within 7 days (or
// already overdue) is HIGH; everything else — including items with no due
// date — defaults to MEDIUM, and the advisor marks it up/down from there.
// Pure and reused on both the capture and apply paths; never a Claude call.
export function derivePriorityFromDueDate(
  dueDate: string | null | undefined
): TaskPriority {
  if (!dueDate) return "medium";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "medium";
  const now = new Date();
  // Compare on calendar days so a date "today" reads as 0, not a fraction.
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfDue = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const daysUntilDue = Math.round((startOfDue - startOfToday) / msPerDay);
  return daysUntilDue <= 7 ? "high" : "medium";
}

// UC-03: deferred items auto-attach to the next agenda UNLESS their due date
// is more than 30 days out (Katie 06.02). No due date, or a date within 30
// days / already past, means it's near enough to surface now.
export function isDeferredEligibleForAutoAttach(
  dueDate: string | null | undefined
): boolean {
  if (!dueDate) return true;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return true;
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfDue = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const daysUntilDue = Math.round((startOfDue - startOfToday) / msPerDay);
  return daysUntilDue <= 30;
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
        `SELECT t.title, t.status, t.priority, t.due_date, t.phase, t.notes,
                t.owner_type, u.name AS assignee_name, st.name AS owner_stakeholder_name
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_id
         LEFT JOIN stakeholders st ON st.id = t.owner_stakeholder_id
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

  // UC-03: deferred items within 30 days (or undated/overdue) auto-attach to
  // this agenda; items dated >30 days out stay in the carry-forward list only.
  // Skip any malformed payload with neither a title nor detail — it would only
  // produce a blank agenda line.
  const eligibleDeferred = deferredItems.filter((d) => {
    const p = d.change_payload;
    if (!p || (!p.title?.trim() && !p.detail?.trim())) return false;
    return isDeferredEligibleForAutoAttach(p.suggested_due_date);
  });

  // Build concrete agenda items from the eligible deferred items. These are
  // merged deterministically below so the rule holds regardless of what Claude
  // chooses to surface (the prompt is told NOT to re-list them). The parallel
  // title list drives backstop de-duplication.
  const deferredTitles = eligibleDeferred.map((d) =>
    (d.change_payload.title ?? "").trim().toLowerCase()
  );
  const deferredAgendaItems: AgendaItem[] = eligibleDeferred.map((d) => {
    const payload = d.change_payload;
    const meetingType = d.source_meeting_type ?? "Meeting";
    const meetingDate = d.source_meeting_date
      ? new Date(d.source_meeting_date).toLocaleDateString()
      : "prior meeting";
    const dueLabel = payload.suggested_due_date
      ? ` (due ${new Date(payload.suggested_due_date).toLocaleDateString()})`
      : "";
    const title = payload.title?.trim() || "(untitled item)";
    const text = payload.detail ? `${title} — ${payload.detail}` : title;
    return {
      text,
      source: `Deferred from ${meetingType} ${meetingDate}${dueLabel}`,
    };
  });

  // Merge the auto-attached deferred items into the "Outstanding Commitments
  // Review" section of a generated agenda. The section title is matched
  // tolerantly (Claude occasionally renames it) so items never land in a
  // dangling sixth section; the canonical title is used only when creating it.
  const COMMITMENTS_SECTION = "Outstanding Commitments Review";
  const attachDeferred = (sections: AgendaSection[]): AgendaSection[] => {
    if (deferredAgendaItems.length === 0) return sections;
    const section =
      sections.find((s) => s.title === COMMITMENTS_SECTION) ??
      sections.find((s) => /commitment/i.test(s.title));
    if (section) {
      // Backstop de-dup: if Claude listed an item despite instructions, skip
      // ours when its title already appears in an existing item's text.
      const existingText = section.items.map((i) => i.text.toLowerCase()).join("\n");
      const fresh = deferredAgendaItems.filter((_, idx) => {
        const title = deferredTitles[idx];
        return !title || !existingText.includes(title);
      });
      section.items = [...section.items, ...fresh];
      return sections;
    }
    return [...sections, { title: COMMITMENTS_SECTION, items: deferredAgendaItems }];
  };
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

  // UC-12: a commitment owned by the client surfaces under the stakeholder's
  // name (tagged "client"); a TFO-owned one keeps the assignee name. Lets the
  // agenda's Outstanding Commitments Review name who is on the hook on each side.
  const ownerLabel = (t: {
    owner_type?: string | null;
    assignee_name?: string | null;
    owner_stakeholder_name?: string | null;
  }): string =>
    t.owner_type === "client"
      ? `${t.owner_stakeholder_name ?? "Client"} (client)`
      : t.assignee_name ?? "Unassigned";

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

OPEN TASKS / COMMITMENTS (${tasks.length} total — owner shown is who is on the hook; "(client)" marks a client-side commitment):
Overdue (${overdueTasks.length}):
${overdueTasks.map((t) => `  • [OVERDUE] ${t.title} — ${ownerLabel(t)} — due ${new Date(t.due_date).toLocaleDateString()}`).join("\n") || "  None"}

Blocked (${blockedTasks.length}):
${blockedTasks.map((t) => `  • [BLOCKED] ${t.title} — ${ownerLabel(t)}${t.notes ? ` — ${t.notes}` : ""}`).join("\n") || "  None"}

In Progress (${inProgressTasks.length}):
${inProgressTasks.map((t) => `  • ${t.title} — ${ownerLabel(t)}`).join("\n") || "  None"}

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

DEFERRED ITEMS FROM PRIOR MEETINGS (${eligibleDeferred.length}) — these are AUTO-ATTACHED to the agenda for you; do NOT re-list them, they are added automatically:
${
  eligibleDeferred.length > 0
    ? eligibleDeferred
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
2. Outstanding Commitments Review — overdue tasks, blocked tasks, and open items from prior meeting notes that haven't been resolved. Do NOT include the DEFERRED ITEMS listed above — they are auto-attached to this section for you.
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
    return attachDeferred(parsed);
  } catch {
    return attachDeferred([
      {
        title: "Client Updates & Requests",
        items: [{ text: "Review client updates since last meeting", source: "Inferred from recent activity" }],
      },
      {
        title: COMMITMENTS_SECTION,
        items: overdueTasks.slice(0, 3).map((t) => ({
          text: `Review status: ${t.title}`,
          source: `From overdue commitment owned by ${ownerLabel(t)}`,
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
    ]);
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
- owner_type: who is on the hook for this commitment. Use "client" when a named person from the KNOWN STAKEHOLDERS list is the one who committed to do it (e.g. "Sarah will send the cap table"). Use "tfo" when a TFO team member owns it, or when ownership is unclear. Default to "tfo".
- owner_stakeholder_id: REQUIRED when owner_type is "client" — the exact stakeholder UUID from the KNOWN STAKEHOLDERS list. Never invent an id; if no stakeholder from the list matches, use owner_type "tfo" instead.
- owner_stakeholder_name: the matching stakeholder's name when owner_type is "client", else null.
- suggested_assignee: exact name from team list when owner_type is "tfo", or null. Leave null for client-owned commitments.
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
      "owner_type": "tfo or client",
      "owner_stakeholder_id": "uuid-from-known-stakeholders-list when owner_type is client, else null",
      "owner_stakeholder_name": "Name when owner_type is client, else null",
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

    // UC-12: stakeholder id → name lookup for normalizing owner fields
    const stakeholderNameById = new Map(captureStakeholders.map((s) => [s.id, s.name]));

    // Gap 3: Enrich task_update changes with a snapshot of the existing task
    for (const change of result.proposed_changes) {
      // UC-03: seed a date-driven default priority for task-creating items.
      // The advisor can override this in the capture panel before applying.
      if (change.type === "new_task" || change.type === "task_update") {
        change.priority = derivePriorityFromDueDate(change.suggested_due_date);
      }

      // UC-12: harden the owner classification on new tasks. Claude occasionally
      // marks a commitment "client" but omits or invents the stakeholder id —
      // downgrade those to "tfo" so we never persist a dangling owner reference.
      // Mirrors the defensive filter applied to proposed_signals above.
      if (change.type === "new_task") {
        if (change.owner_type === "client" && change.owner_stakeholder_id && stakeholderIdSet.has(change.owner_stakeholder_id)) {
          change.owner_stakeholder_name = stakeholderNameById.get(change.owner_stakeholder_id) ?? null;
          change.suggested_assignee = undefined; // client-owned: not a TFO assignee
        } else {
          change.owner_type = "tfo";
          change.owner_stakeholder_id = null;
          change.owner_stakeholder_name = null;
        }
      }
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

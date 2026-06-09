import { query } from "./db.js";
import { parseAgendaSections } from "./lib/agendaParser.js";
import { buildDeliverableDocx } from "./lib/deliverableDocx.js";
import { saveReportToDataRoom } from "./lib/saveReport.js";
import {
  CATEGORY_BY_REPORT_TYPE,
  REPORT_TITLE_BY_TYPE,
} from "./lib/reportCategories.js";
import { generateAgenda } from "./lib/meetingIntelligence.js";
import { snapshotAgendaToDataRoom } from "./lib/agendaSnapshot.js";

export const tools = [
  {
    name: "create_task",
    description:
      "Create a new sprint task for a client engagement. Use this when the advisor asks to add a task, create an action item, or plan work.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        assignee: {
          type: "string",
          enum: ["advisor", "client"],
          description: "Who is responsible",
        },
        priority: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Task priority",
        },
        dueDate: { type: "string", description: "Due date (e.g., 'Apr 15, 2026')" },
        clientName: { type: "string", description: "Which client this task is for" },
      },
      required: ["title", "assignee", "priority"],
    },
  },
  {
    name: "move_prospect",
    description:
      "Move a prospect to a different stage in the pipeline. Use when the advisor says to advance, promote, or change a prospect's status.",
    input_schema: {
      type: "object" as const,
      properties: {
        prospectName: { type: "string", description: "Name of the prospect" },
        newStatus: {
          type: "string",
          enum: [
            "intake",
            "discovery_scheduled",
            "discovery_complete",
            "fit_assessment",
            "fit",
            "not_fit",
            "onboarding",
          ],
          description: "New pipeline stage",
        },
        notes: { type: "string", description: "Optional notes about why" },
      },
      required: ["prospectName", "newStatus"],
    },
  },
  {
    name: "generate_report",
    description:
      "Generate a professional advisory report or memo. Use when the advisor asks to draft, create, or generate a document like a Capital Readiness Memo, Client Brief, Risk Summary, Board Update, Assessment Summary, Meeting Recap, Monthly Status Update, or Onboarding Brief.",
    input_schema: {
      type: "object" as const,
      properties: {
        reportType: {
          type: "string",
          enum: [
            "capital_readiness_memo",
            "client_brief",
            "risk_summary",
            "board_update",
            "assessment_summary",
            "quarterly_review",
            "meeting_recap",
            "monthly_status_update",
            "onboarding_brief",
          ],
          description: "Type of report",
        },
        clientName: { type: "string", description: "Client the report is for" },
        format: {
          type: "string",
          enum: ["markdown", "pdf"],
          description: "Output format",
        },
        subfolder: {
          type: "string",
          description: "Optional. Data Room folder to save this report to. Defaults to 'Reports'. Available folders: Reports, Financials, Customer Capital, Legal & Structure, Governance, Meeting Notes, Agreements, Project Management, Liability, Other.",
        },
      },
      required: ["reportType", "clientName"],
    },
  },
  {
    name: "save_report",
    description:
      "Persist a report you have finished composing. Call this AFTER generate_report and AFTER you have written the complete report. Pass the full report markdown in `content` — exactly what should appear in the saved document. The document is built from `content`, NOT from your chat reply, so the report body must be in `content`.",
    input_schema: {
      type: "object" as const,
      properties: {
        reportType: {
          type: "string",
          enum: [
            "capital_readiness_memo",
            "client_brief",
            "risk_summary",
            "board_update",
            "assessment_summary",
            "quarterly_review",
            "meeting_recap",
            "monthly_status_update",
            "onboarding_brief",
          ],
          description: "Must match the reportType passed to generate_report.",
        },
        clientName: { type: "string", description: "Client the report is for" },
        content: {
          type: "string",
          description:
            "The complete report in professional markdown — the full body that should be saved to the document. Do NOT put a confirmation message here.",
        },
        subfolder: {
          type: "string",
          description:
            "Optional. Data Room folder to save to. Must match the subfolder passed to generate_report. Defaults to 'Reports'. Available folders: Reports, Financials, Customer Capital, Legal & Structure, Governance, Meeting Notes, Agreements, Project Management, Liability, Other.",
        },
      },
      required: ["reportType", "clientName", "content"],
    },
  },
  {
    name: "update_instrument_status",
    description:
      "Update the status of a diagnostic instrument for a client. Use when the advisor says an instrument is complete, started, or needs attention.",
    input_schema: {
      type: "object" as const,
      properties: {
        instrumentName: {
          type: "string",
          description: "Name of the instrument (e.g., 'Founder Business Index')",
        },
        clientName: { type: "string", description: "Client name" },
        newStatus: {
          type: "string",
          enum: ["not_started", "in_progress", "complete"],
          description: "New status",
        },
      },
      required: ["instrumentName", "clientName", "newStatus"],
    },
  },
  {
    name: "flag_risk",
    description:
      "Flag a new risk alert for a client. Use when the advisor identifies a concern that should be tracked.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Risk title" },
        detail: { type: "string", description: "Risk description and impact" },
        severity: {
          type: "string",
          enum: ["critical", "warning", "info"],
          description: "Severity level",
        },
        clientName: { type: "string", description: "Affected client" },
      },
      required: ["title", "severity", "clientName"],
    },
  },
  {
    name: "schedule_meeting",
    description:
      "Schedule a meeting with a client. Use when the advisor wants to set up a review, check-in, or strategy session.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: { type: "string", description: "Client name" },
        meetingType: {
          type: "string",
          enum: [
            "quarterly_review",
            "sprint_checkin",
            "strategy_session",
            "document_review",
          ],
          description: "Type of meeting",
        },
        date: { type: "string", description: "Proposed date (e.g., 'Apr 10, 2026')" },
        notes: { type: "string", description: "Agenda or notes" },
      },
      required: ["clientName", "meetingType", "date"],
    },
  },
  {
    name: "get_meeting_agenda",
    description:
      "Look up the agenda for a specific meeting. ALWAYS call this first when the advisor asks about an agenda for an upcoming, recent, or specific meeting — never invent or guess agenda items from open tasks before calling this tool. Returns the locked or draft agenda if one exists, or a clear 'no agenda' signal if not.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: {
          type: "string",
          description: "Name of the client whose meeting agenda to look up",
        },
        meetingId: {
          type: "string",
          description: "Exact meeting UUID if known. Optional.",
        },
        when: {
          type: "string",
          enum: ["upcoming", "last"],
          description:
            "If meetingId is unknown: 'upcoming' returns the next future meeting (default), 'last' returns the most recent past meeting.",
        },
      },
      required: ["clientName"],
    },
  },
  {
    name: "generate_meeting_agenda",
    description:
      "Generate a NEW meeting agenda for a client and save it to the Data Room. Use ONLY when the advisor asks to CREATE, DRAFT, BUILD, or GENERATE an agenda (not to view an existing one — use get_meeting_agenda for that). Builds the same 5-section agenda as the Meetings tab (Client Updates & Requests, Outstanding Commitments Review, Workplan Status, Methodology-Aligned Topics, Forward-Looking Decisions) and files a .docx in the 'Meeting Agendas' folder as a draft. Do NOT compose agenda items yourself — this tool generates them.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: {
          type: "string",
          description: "Name of the client to build the agenda for",
        },
        meetingId: {
          type: "string",
          description: "Exact meeting UUID if known. Optional.",
        },
        meetingTiming: {
          type: "string",
          enum: ["upcoming", "last"],
          description:
            "If meetingId is unknown: 'upcoming' targets the next future meeting (default), 'last' targets the most recent past meeting.",
        },
      },
      required: ["clientName"],
    },
  },
  {
    name: "generate_engagement_briefing",
    description:
      "Generate a structured onboarding briefing for a client engagement. Covers client history, current quarter state, open tasks, risk alerts, stakeholders, and upcoming priorities. Use this when an advisor asks to be briefed on a client, or says 'brief me', 'onboard me', 'catch me up', or similar.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: {
          type: "string",
          description: "The name of the client to generate the briefing for",
        },
      },
      required: ["clientName"],
    },
  },
];

// Helper: look up a client by name for this advisor, returns null if not found.
// Prefers an EXACT (case-insensitive) name match. Only falls back to a partial
// match when there's no exact hit — and refuses (returns null) if the partial
// match is ambiguous (more than one client), so we never silently pick the
// wrong client and leak their data into another client's deliverable.
async function findClientByName(
  clientName: string,
  advisorId: string
): Promise<string | null> {
  if (!clientName) return null;

  // 1. Exact, case-insensitive match wins.
  const exact = await query(
    "SELECT id FROM clients WHERE advisor_id = $1 AND name ILIKE $2",
    [advisorId, clientName]
  );
  if (exact.rows.length === 1) return exact.rows[0].id;
  if (exact.rows.length > 1) return null; // ambiguous even on exact name

  // 2. Fall back to a partial match, but only if it's unambiguous.
  const partial = await query(
    "SELECT id FROM clients WHERE advisor_id = $1 AND name ILIKE $2",
    [advisorId, `%${clientName}%`]
  );
  if (partial.rows.length === 1) return partial.rows[0].id;
  return null; // zero or multiple matches → refuse rather than guess
}

// Resolve which client a tool should act on. When the request is scoped to a
// client workspace (activeClientId present and already auth-verified by the
// /api/chat handler), ALWAYS use that verified id — the model-supplied name is
// only a display label and must never redirect the action to a different
// client. Only fall back to a name lookup for unscoped (advisor-home) chats.
// Returns the canonical { id, name } so callers label artifacts with the real
// client name, never the (possibly wrong) model-supplied one.
async function resolveClient(
  activeClientId: string | undefined,
  clientName: unknown,
  advisorId: string
): Promise<{ id: string; name: string } | null> {
  let id: string | null = activeClientId ?? null;
  if (!id && typeof clientName === "string" && clientName) {
    id = await findClientByName(clientName, advisorId);
  }
  if (!id) return null;
  // Confirm the resolved client belongs to this advisor and fetch its real
  // name (defensive — activeClientId is already auth-verified upstream).
  const result = await query(
    "SELECT id, name FROM clients WHERE id = $1 AND advisor_id = $2",
    [id, advisorId]
  );
  if (result.rows.length === 0) return null;
  return { id: result.rows[0].id, name: result.rows[0].name };
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  advisorId: string,
  activeClientId?: string
): Promise<{ success: boolean; result: string; action?: Record<string, unknown> }> {
  switch (name) {
    case "create_task": {
      // In a client workspace the verified active client always wins; the name
      // is a label only. Name lookup is used solely for unscoped chats.
      const client = await resolveClient(activeClientId, input.clientName, advisorId);

      if (!client) {
        return {
          success: false,
          result: `Task not created: could not resolve client "${input.clientName ?? "(none)"}". Please specify a valid client name.`,
          action: { type: "task_failed", reason: "client_not_found" },
        };
      }
      const clientId = client.id;

      try {
        await query(
          `INSERT INTO tasks (client_id, title, assignee, status, priority, due_date)
           VALUES ($1, $2, $3, 'todo', $4, $5)`,
          [
            clientId,
            input.title,
            input.assignee ?? "advisor",
            input.priority ?? "medium",
            input.dueDate ?? null,
          ]
        );
        return {
          success: true,
          result: `Task "${input.title}" created for ${client.name}, assigned to ${input.assignee}, priority: ${input.priority}, due: ${input.dueDate ?? "TBD"}`,
          action: { type: "task_created", ...input, clientName: client.name, clientId },
        };
      } catch (err) {
        console.error("create_task DB error:", err);
        return { success: false, result: "Failed to save task to database." };
      }
    }

    case "move_prospect": {
      try {
        const result = await query(
          "UPDATE prospects SET status = $1 WHERE advisor_id = $2 AND name ILIKE $3 RETURNING id, name, status",
          [input.newStatus, advisorId, `%${input.prospectName}%`]
        );
        if (result.rows.length === 0) {
          return {
            success: false,
            result: `Prospect "${input.prospectName}" not found in your pipeline.`,
            action: { type: "prospect_not_found" },
          };
        }
        return {
          success: true,
          result: `Prospect "${result.rows[0].name}" moved to ${input.newStatus}. ${input.notes ?? ""}`,
          action: { type: "prospect_moved", prospectId: result.rows[0].id, ...input },
        };
      } catch (err) {
        console.error("move_prospect DB error:", err);
        return { success: false, result: "Failed to update prospect status." };
      }
    }

    case "generate_report": {
      // Deliverable records track generated reports. Verified active client
      // wins so a report is never saved into the wrong client's Data Room.
      const client = await resolveClient(activeClientId, input.clientName, advisorId);
      const clientId = client?.id ?? null;
      const clientLabel = client?.name ?? (input.clientName as string | undefined) ?? "the client";

      const reportTitle =
        REPORT_TITLE_BY_TYPE[input.reportType as string] ?? String(input.reportType);

      // Build type-specific context from DB for richer generation
      let contextBlock = "";
      if (clientId) {
        try {
          const reportType = input.reportType as string;

          if (reportType === "meeting_recap") {
            const mtgResult = await query(
              `SELECT type, date, notes, status FROM meetings
               WHERE client_id = $1
               ORDER BY date DESC NULLS LAST LIMIT 1`,
              [clientId]
            );
            if (mtgResult.rows.length > 0) {
              const m = mtgResult.rows[0];
              const dateStr = m.date ? new Date(m.date as string).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Date unknown";
              contextBlock = `\n\nMost recent meeting context:\n- Type: ${m.type ?? "General"}\n- Date: ${dateStr}\n- Status: ${m.status}\n- Notes: ${m.notes ?? "(no notes recorded)"}`;
            } else {
              contextBlock = "\n\nNo meetings on record yet — draft a general recap template.";
            }
          } else if (reportType === "quarterly_review") {
            const qpResult = await query(
              `SELECT qp.label, qp.status, qp.quarter, qp.year,
                      COUNT(t.id) FILTER (WHERE t.status = 'done') AS completed_tasks,
                      COUNT(t.id) FILTER (WHERE t.status != 'done') AS open_tasks
               FROM quarterly_plans qp
               LEFT JOIN tasks t ON t.client_id = qp.client_id
               WHERE qp.client_id = $1
               ORDER BY qp.year DESC, qp.quarter DESC LIMIT 1`,
              [clientId]
            );
            const phaseResult = await query(
              `SELECT phase, label, status FROM quarterly_phases
               WHERE plan_id IN (
                 SELECT id FROM quarterly_plans WHERE client_id = $1
                 ORDER BY year DESC, quarter DESC LIMIT 1
               ) ORDER BY sort_order`,
              [clientId]
            );
            if (qpResult.rows.length > 0) {
              const qp = qpResult.rows[0];
              const phases = phaseResult.rows.map((p: { phase: string; label: string; status: string }) => `  - ${p.label ?? p.phase}: ${p.status}`).join("\n");
              contextBlock = `\n\nQuarterly plan context (Q${qp.quarter as number} ${qp.year as number}):\n- Plan label: ${qp.label ?? "Unnamed"}\n- Status: ${qp.status}\n- Completed tasks: ${qp.completed_tasks as number}\n- Open tasks: ${qp.open_tasks as number}\nPhases:\n${phases || "  (no phases recorded)"}`;
            }
          } else if (reportType === "monthly_status_update") {
            const taskResult = await query(
              `SELECT
                 COUNT(*) FILTER (WHERE status != 'done') AS open_count,
                 COUNT(*) FILTER (WHERE status = 'done' AND updated_at >= NOW() - INTERVAL '30 days') AS completed_this_month
               FROM tasks WHERE client_id = $1`,
              [clientId]
            );
            const riskResult = await query(
              `SELECT COUNT(*) AS active_risks FROM risk_alerts
               WHERE client_id = $1 AND resolved = false`,
              [clientId]
            );
            const t = taskResult.rows[0];
            const r = riskResult.rows[0];
            contextBlock = `\n\nMonthly status context:\n- Open tasks: ${t?.open_count ?? 0}\n- Tasks completed in last 30 days: ${t?.completed_this_month ?? 0}\n- Active risk alerts: ${r?.active_risks ?? 0}`;
          } else if (reportType === "risk_summary") {
            const risksResult = await query(
              `SELECT title, severity, detail FROM risk_alerts
               WHERE client_id = $1 AND resolved = false
               ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, created_at DESC`,
              [clientId]
            );
            if (risksResult.rows.length > 0) {
              const riskLines = risksResult.rows.map(
                (r: { title: string; severity: string; detail: string | null }) =>
                  `  - [${(r.severity as string).toUpperCase()}] ${r.title as string}${r.detail ? ": " + (r.detail as string) : ""}`
              ).join("\n");
              contextBlock = `\n\nActive risk alerts (${risksResult.rows.length as number} total):\n${riskLines}`;
            } else {
              contextBlock = "\n\nNo active risk alerts on record — note this in the summary.";
            }
          } else if (
            reportType === "capital_readiness_memo" ||
            reportType === "client_brief" ||
            reportType === "board_update" ||
            reportType === "assessment_summary"
          ) {
            const keysResult = await query(
              `SELECT clarity, alignment, structure, stewardship, velocity, legacy, notes
               FROM client_six_keys WHERE client_id = $1
               ORDER BY created_at DESC LIMIT 1`,
              [clientId]
            );
            if (keysResult.rows.length > 0) {
              const k = keysResult.rows[0];
              const scores = ["clarity", "alignment", "structure", "stewardship", "velocity", "legacy"]
                .map((key) => `  - ${key.charAt(0).toUpperCase() + key.slice(1)}: ${(k[key] as number | null) ?? "N/A"}/100`)
                .join("\n");
              contextBlock = `\n\nSix Keys scores:\n${scores}${k.notes ? "\n- Notes: " + (k.notes as string) : ""}`;
            } else {
              contextBlock = "\n\nNo Six Keys scores on record — use available client context to draft best-effort report.";
            }
          }
          // onboarding_brief: handled by generate_engagement_briefing — no extra context needed
        } catch (contextErr) {
          // Non-fatal — proceed without context if DB query fails
          console.warn("generate_report: context query failed:", contextErr);
        }
      }

      try {
        if (clientId) {
          await query(
            `INSERT INTO deliverables (client_id, title, status, engine)
             VALUES ($1, $2, 'ready', 'Copilot')
             ON CONFLICT DO NOTHING`,
            [clientId, reportTitle]
          );
        }
        return {
          success: true,
          result: `Context gathered for "${reportTitle}" (${clientLabel}). Now compose the full "${reportTitle}" report in professional markdown for a financial advisor audience.${contextBlock}\n\nUse all available context to produce a thorough, actionable report — clear headers, bullet points where appropriate, and a concise executive summary at the top. When the report is complete, call save_report with the FULL report markdown in the "content" field (matching reportType and subfolder). Do NOT treat this as done until save_report has been called — your chat reply is not saved, only the content passed to save_report is.`,
          action: { type: "report_generated", ...input, clientName: clientLabel, clientId, reportTitle },
        };
      } catch (err) {
        console.error("generate_report DB error:", err);
        return {
          success: true,
          result: `Compose the full "${reportTitle}" report in professional markdown for ${clientLabel}.${contextBlock}\n\nStructure it clearly with headers and a concise executive summary at the top. When complete, call save_report with the full report markdown in "content" (matching reportType and subfolder). Your chat reply is not saved — only save_report's content is.`,
          action: { type: "report_generated", ...input, clientName: clientLabel, reportTitle },
        };
      }
    }

    case "save_report": {
      // Persist a finished report. The document body comes from the explicit
      // `content` argument — never from the model's chat text — so a confirmation
      // reply can no longer end up as the saved document.
      const client = await resolveClient(activeClientId, input.clientName, advisorId);
      if (!client) {
        return {
          success: false,
          result: `Report not saved: could not resolve client "${input.clientName ?? "(none)"}". Please specify a valid client name.`,
          action: { type: "report_save_failed", reason: "client_not_found" },
        };
      }

      const content = typeof input.content === "string" ? input.content : "";
      if (!content.trim()) {
        return {
          success: false,
          result:
            "No report content was provided to save. Compose the full report first, then call save_report with the complete markdown in the \"content\" field.",
          action: { type: "report_save_failed", reason: "empty_content" },
        };
      }

      const reportTitle =
        REPORT_TITLE_BY_TYPE[input.reportType as string] ?? String(input.reportType);
      const category =
        (input.subfolder as string | undefined) ??
        CATEGORY_BY_REPORT_TYPE[input.reportType as string] ??
        "Reports";

      try {
        // Reconcile with the row generate_report created; self-sufficient if it
        // wasn't (so the report always lands in the Deliverables list).
        let delRow = (
          await query(
            `SELECT id FROM deliverables
             WHERE client_id = $1 AND title = $2 AND archived_at IS NULL
             ORDER BY created_at DESC LIMIT 1`,
            [client.id, reportTitle]
          )
        ).rows[0] as { id: string } | undefined;

        if (!delRow) {
          delRow = (
            await query(
              `INSERT INTO deliverables (client_id, title, status, engine)
               VALUES ($1, $2, 'ready', 'Copilot')
               RETURNING id`,
              [client.id, reportTitle]
            )
          ).rows[0] as { id: string };
        }

        // Build the document first — a docx failure then leaves the deliverable
        // row's content untouched rather than written-but-with-no-file.
        const generatedAt = new Date().toISOString().slice(0, 10);
        const docxBuffer = await buildDeliverableDocx({
          title: reportTitle,
          clientName: client.name,
          generatedAt,
          markdownContent: content,
        });

        const updated = (
          await query(
            `UPDATE deliverables
             SET content = $1,
                 review_status = COALESCE(review_status, 'pending_review'),
                 generated_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2
             RETURNING review_status`,
            [content, delRow.id]
          )
        ).rows[0] as { review_status: string | null } | undefined;

        const reviewStatus = (updated?.review_status ?? "pending_review") as
          | "pending_review"
          | "approved"
          | "client_approved";

        const dataRoomResult = await saveReportToDataRoom({
          clientId: client.id,
          baseTitle: `${reportTitle} — ${client.name}`,
          contentBuffer: docxBuffer,
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          extension: "docx",
          deliverableId: delRow.id,
          reviewStatus,
          category,
        });

        if (!dataRoomResult.saved) {
          console.warn("save_report Data Room save failed:", dataRoomResult.error, {
            deliverableId: delRow.id,
            name: dataRoomResult.name,
          });
          return {
            success: false,
            result: `The report "${reportTitle}" was recorded but could not be filed in the Data Room (${dataRoomResult.error ?? "storage error"}). Let the advisor know it may need to be re-saved.`,
            action: { type: "report_save_failed", reason: "data_room_error", deliverableId: delRow.id },
          };
        }

        return {
          success: true,
          result: `Saved "${reportTitle}" for ${client.name} to the ${category} folder (${dataRoomResult.name}). Confirm to the advisor and suggest next steps.`,
          action: {
            type: "report_saved",
            deliverableId: delRow.id,
            clientId: client.id,
            clientName: client.name,
            reportTitle,
            category,
          },
        };
      } catch (err) {
        console.error("save_report DB error:", err);
        return { success: false, result: "Failed to save the report." };
      }
    }

    case "update_instrument_status": {
      try {
        const client = await resolveClient(activeClientId, input.clientName, advisorId);

        if (!client) {
          return {
            success: false,
            result: `Could not resolve client "${input.clientName ?? "(none)"}". Instrument status not updated.`,
          };
        }
        const clientId = client.id;

        const result = await query(
          `UPDATE instruments SET status = $1
           WHERE client_id = $2 AND name ILIKE $3
           RETURNING id, name, status`,
          [input.newStatus, clientId, `%${input.instrumentName}%`]
        );

        if (result.rows.length === 0) {
          return {
            success: false,
            result: `Instrument "${input.instrumentName}" not found for ${client.name}.`,
            action: { type: "instrument_not_found" },
          };
        }

        return {
          success: true,
          result: `Instrument "${result.rows[0].name}" for ${client.name} updated to "${input.newStatus}"`,
          action: { type: "instrument_updated", instrumentId: result.rows[0].id, ...input, clientName: client.name },
        };
      } catch (err) {
        console.error("update_instrument_status DB error:", err);
        return { success: false, result: "Failed to update instrument status." };
      }
    }

    case "flag_risk": {
      const client = await resolveClient(activeClientId, input.clientName, advisorId);

      if (!client) {
        return {
          success: false,
          result: `Could not resolve client "${input.clientName ?? "(none)"}". Risk alert not saved.`,
        };
      }
      const clientId = client.id;

      try {
        const result = await query(
          `INSERT INTO risk_alerts (client_id, title, detail, severity)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [clientId, input.title, input.detail ?? null, input.severity ?? "info"]
        );
        return {
          success: true,
          result: `Risk alert "${input.title}" flagged as ${input.severity} for ${client.name}: ${input.detail ?? ""}`,
          action: { type: "risk_flagged", alertId: result.rows[0].id, ...input, clientName: client.name, clientId },
        };
      } catch (err) {
        console.error("flag_risk DB error:", err);
        return { success: false, result: "Failed to save risk alert to database." };
      }
    }

    case "schedule_meeting": {
      const client = await resolveClient(activeClientId, input.clientName, advisorId);

      if (!client) {
        return {
          success: false,
          result: `Could not resolve client "${input.clientName ?? "(none)"}". Meeting not scheduled.`,
        };
      }
      const clientId = client.id;

      try {
        const result = await query(
          `INSERT INTO meetings (client_id, type, date, notes, status)
           VALUES ($1, $2, $3, $4, 'scheduled') RETURNING id`,
          [clientId, input.meetingType, input.date, input.notes ?? null]
        );
        return {
          success: true,
          result: `${input.meetingType} meeting scheduled with ${client.name} for ${input.date}. ${input.notes ?? ""}`,
          action: { type: "meeting_scheduled", meetingId: result.rows[0].id, ...input, clientName: client.name, clientId },
        };
      } catch (err) {
        console.error("schedule_meeting DB error:", err);
        return { success: false, result: "Failed to save meeting to database." };
      }
    }

    case "get_meeting_agenda": {
      const client = await resolveClient(activeClientId, input.clientName, advisorId);
      if (!client) {
        return {
          success: false,
          result: `Could not resolve client "${input.clientName ?? "(none)"}". No agenda lookup possible.`,
          action: { type: "agenda_lookup_failed", reason: "client_not_found" },
        };
      }
      const clientId = client.id;

      try {
        let meetingRow:
          | {
              id: string;
              type: string | null;
              date: string | null;
              agenda: string | null;
              agenda_status: string | null;
            }
          | undefined;

        if (input.meetingId) {
          const r = await query(
            `SELECT id, type, date, agenda, agenda_status
               FROM meetings
              WHERE id = $1 AND client_id = $2`,
            [input.meetingId, clientId]
          );
          meetingRow = r.rows[0];
        } else if (input.when === "last") {
          const r = await query(
            `SELECT id, type, date, agenda, agenda_status
               FROM meetings
              WHERE client_id = $1 AND date IS NOT NULL AND date < NOW()
              ORDER BY date DESC
              LIMIT 1`,
            [clientId]
          );
          meetingRow = r.rows[0];
        } else {
          // Default: nearest upcoming meeting
          const r = await query(
            `SELECT id, type, date, agenda, agenda_status
               FROM meetings
              WHERE client_id = $1 AND date IS NOT NULL AND date >= NOW()
              ORDER BY date ASC
              LIMIT 1`,
            [clientId]
          );
          meetingRow = r.rows[0];
        }

        if (!meetingRow) {
          return {
            success: true,
            result: `No matching meeting found for ${client.name}.`,
            action: { type: "agenda_not_found", reason: "meeting_not_found" },
          };
        }

        const dateIso = meetingRow.date ?? "no date";

        if (!meetingRow.agenda || meetingRow.agenda_status === "none" || !meetingRow.agenda_status) {
          return {
            success: true,
            result: `Meeting found: ${meetingRow.type ?? "Meeting"} on ${dateIso} for ${client.name}. STATUS: NO AGENDA HAS BEEN LOGGED for this meeting. You may suggest topics for the advisor to consider — but you MUST explicitly label them as "suggested" or "proposed", and never present them as if they were the actual agenda.`,
            action: {
              type: "agenda_retrieved",
              meetingId: meetingRow.id,
              status: "none",
            },
          };
        }

        const sections = parseAgendaSections(meetingRow.agenda);
        if (sections.length === 0) {
          return {
            success: false,
            result: `Agenda data for meeting ${meetingRow.id} could not be parsed. Treat this as no agenda available.`,
            action: { type: "agenda_parse_error", meetingId: meetingRow.id },
          };
        }

        const agendaMd = sections
          .map((s, i) => {
            const items = s.items
              .map((it) => `  - ${it.text}${it.source ? `\n    Context: ${it.source}` : ""}`)
              .join("\n");
            return `${i + 1}. ${s.title}\n${items}`;
          })
          .join("\n\n");

        const statusLabel =
          meetingRow.agenda_status === "final" ? "FINAL (locked)" : "DRAFT";

        return {
          success: true,
          result: `Meeting: ${meetingRow.type ?? "Meeting"} on ${dateIso} for ${client.name}.\nAgenda status: ${statusLabel}\n\nAgenda items:\n${agendaMd}\n\nPresent this agenda to the advisor as-is. Do not invent additional items or replace it with task-derived suggestions.`,
          action: {
            type: "agenda_retrieved",
            meetingId: meetingRow.id,
            status: meetingRow.agenda_status,
          },
        };
      } catch (err) {
        console.error("get_meeting_agenda DB error:", err);
        return { success: false, result: "Failed to look up meeting agenda." };
      }
    }

    case "generate_meeting_agenda": {
      // Generate a NEW agenda by reusing the same engine the Meetings tab uses,
      // then export the branded .docx into the "Meeting Agendas" folder. This is
      // distinct from get_meeting_agenda (which only retrieves an existing one).
      const client = await resolveClient(activeClientId, input.clientName, advisorId);
      if (!client) {
        return {
          success: false,
          result: `Agenda not generated: could not resolve client "${input.clientName ?? "(none)"}". Please specify a valid client name.`,
          action: { type: "agenda_generation_failed", reason: "client_not_found" },
        };
      }
      const clientId = client.id;

      try {
        // Resolve the target meeting: explicit id → nearest upcoming → most
        // recent past. No meeting at all means there's nothing to build for.
        let meetingRow:
          | { id: string; type: string | null; date: string | null }
          | undefined;

        if (input.meetingId) {
          meetingRow = (
            await query(
              `SELECT id, type, date FROM meetings WHERE id = $1 AND client_id = $2`,
              [input.meetingId, clientId]
            )
          ).rows[0];
        } else if (input.meetingTiming === "last") {
          meetingRow = (
            await query(
              `SELECT id, type, date FROM meetings
               WHERE client_id = $1 AND date IS NOT NULL AND date < NOW()
               ORDER BY date DESC LIMIT 1`,
              [clientId]
            )
          ).rows[0];
        } else {
          // Default: nearest upcoming meeting; fall back to most recent if none.
          meetingRow = (
            await query(
              `SELECT id, type, date FROM meetings
               WHERE client_id = $1 AND date IS NOT NULL AND date >= NOW()
               ORDER BY date ASC LIMIT 1`,
              [clientId]
            )
          ).rows[0];
          if (!meetingRow) {
            meetingRow = (
              await query(
                `SELECT id, type, date FROM meetings
                 WHERE client_id = $1
                 ORDER BY date DESC NULLS LAST LIMIT 1`,
                [clientId]
              )
            ).rows[0];
          }
        }

        if (!meetingRow) {
          return {
            success: true,
            result: `No meeting found for ${client.name} to build an agenda for. Schedule a meeting first, then generate the agenda.`,
            action: { type: "agenda_generation_failed", reason: "meeting_not_found" },
          };
        }

        // Reuse the canonical 5-section generator (same as the Meetings tab).
        const sections = await generateAgenda(meetingRow.id, clientId, advisorId);
        const agendaText = JSON.stringify(sections);

        await query(
          `UPDATE meetings SET agenda = $1, agenda_status = 'draft', updated_at = NOW()
           WHERE id = $2`,
          [agendaText, meetingRow.id]
        );

        const dateLabel = meetingRow.date
          ? new Date(meetingRow.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "an undated meeting";

        // Export the branded .docx into the "Meeting Agendas" folder. Idempotent:
        // re-locking the meeting in the UI upserts the same file. The agenda is
        // already committed to the meeting above, so a Data Room failure here is
        // a partial success — surface that rather than claiming nothing was done.
        try {
          await snapshotAgendaToDataRoom(
            {
              id: meetingRow.id,
              client_id: clientId,
              type: meetingRow.type,
              date: meetingRow.date,
              agenda: agendaText,
              agenda_status: "draft",
            },
            advisorId
          );
        } catch (snapErr) {
          console.warn("generate_meeting_agenda Data Room export failed:", snapErr, {
            meetingId: meetingRow.id,
            clientId,
          });
          return {
            success: true,
            result: `Drafted a ${sections.length}-section agenda for ${client.name}'s ${meetingRow.type ?? "meeting"} on ${dateLabel}. It's saved to the meeting (open the Meetings tab to review and lock it), but exporting the .docx to the Data Room failed — let the advisor know it can be downloaded from the Meetings tab in the meantime.`,
            action: {
              type: "agenda_generated",
              meetingId: meetingRow.id,
              clientId,
              clientName: client.name,
              dataRoomExportFailed: true,
            },
          };
        }

        return {
          success: true,
          result: `Drafted a ${sections.length}-section agenda for ${client.name}'s ${meetingRow.type ?? "meeting"} on ${dateLabel} and saved it to the Meeting Agendas folder in the Data Room. It's a draft — review and lock it in the Meetings tab when ready. Confirm to the advisor and offer to walk through it.`,
          action: {
            type: "agenda_generated",
            meetingId: meetingRow.id,
            clientId,
            clientName: client.name,
          },
        };
      } catch (err) {
        console.error("generate_meeting_agenda error:", err);
        return {
          success: false,
          result: "Failed to generate the meeting agenda. The meeting record may be missing required data.",
        };
      }
    }

    case "generate_engagement_briefing": {
      // Verified active client wins so a briefing is never built for / saved
      // under a different client than the open workspace. The canonical name
      // (not the model-supplied label) titles the deliverable and drives the
      // briefing, so a mislabelled request can't surface another client's data.
      const client = await resolveClient(activeClientId, input.clientName, advisorId);

      if (!client) {
        return {
          success: false,
          result: `Briefing not generated: could not resolve client "${input.clientName ?? "(none)"}". Please specify a valid client name.`,
          action: { type: "briefing_failed", reason: "client_not_found" },
        };
      }
      const clientId = client.id;

      try {
        await query(
          `INSERT INTO deliverables (client_id, title, status, engine)
           VALUES ($1, $2, 'ready', 'Copilot')
           ON CONFLICT DO NOTHING`,
          [clientId, `Engagement Briefing — ${client.name}`]
        );
        return {
          success: true,
          result: `Engagement briefing created for ${client.name}. Now write the full briefing in markdown following the onboarding_brief template: title, snapshot cue, then sections for Client Overview, Long-Term Objective, Current Phase, Six Keys Snapshot, Stakeholder Map, Recent Meetings, Open Tasks, Open Commitments, Risk Alerts, What's Coming Next, and the 'Want to go deeper?' QB AI footer. Use all context available. The briefing is for ${client.name} — use only this client's data.`,
          action: {
            type: "briefing_generated",
            clientId,
            clientName: client.name,
          },
        };
      } catch (err) {
        console.error("generate_engagement_briefing DB error:", err);
        return {
          success: true,
          result: `Now write the full engagement briefing for ${client.name} in markdown following the onboarding_brief template: title, snapshot cue, then sections for Client Overview, Long-Term Objective, Current Phase, Six Keys Snapshot, Stakeholder Map, Recent Meetings, Open Tasks, Open Commitments, Risk Alerts, What's Coming Next, and the 'Want to go deeper?' QB AI footer. The briefing is for ${client.name} — use only this client's data.`,
          action: { type: "briefing_generated", clientId, clientName: client.name },
        };
      }
    }

    default:
      return { success: false, result: `Unknown tool: ${name}` };
  }
}

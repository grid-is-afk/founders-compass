import { query } from "./db.js";

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

// Helper: look up a client by name for this advisor, returns null if not found
async function findClientByName(
  clientName: string,
  advisorId: string
): Promise<string | null> {
  if (!clientName) return null;
  const result = await query(
    "SELECT id FROM clients WHERE advisor_id = $1 AND name ILIKE $2 LIMIT 1",
    [advisorId, `%${clientName}%`]
  );
  return result.rows[0]?.id ?? null;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  advisorId: string,
  activeClientId?: string
): Promise<{ success: boolean; result: string; action?: Record<string, unknown> }> {
  switch (name) {
    case "create_task": {
      // Resolve client — prefer explicit clientName in input, fall back to activeClientId
      let clientId = activeClientId ?? null;
      if (input.clientName) {
        const found = await findClientByName(input.clientName as string, advisorId);
        if (found) clientId = found;
      }

      if (!clientId) {
        return {
          success: false,
          result: `Task not created: could not resolve client "${input.clientName ?? "(none)"}". Please specify a valid client name.`,
          action: { type: "task_failed", reason: "client_not_found" },
        };
      }

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
          result: `Task "${input.title}" created for ${input.clientName ?? "the client"}, assigned to ${input.assignee}, priority: ${input.priority}, due: ${input.dueDate ?? "TBD"}`,
          action: { type: "task_created", ...input, clientId },
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
      // Deliverable records track generated reports
      let clientId = activeClientId ?? null;
      if (input.clientName) {
        const found = await findClientByName(input.clientName as string, advisorId);
        if (found) clientId = found;
      }

      const titleMap: Record<string, string> = {
        capital_readiness_memo: "Capital Readiness Memo",
        client_brief: "Client Brief",
        risk_summary: "Risk Summary",
        board_update: "Board-Style Update",
        assessment_summary: "Assessment Summary",
        quarterly_review: "Quarterly Review",
        meeting_recap: "Meeting Recap",
        monthly_status_update: "Monthly Status Update",
        onboarding_brief: "Onboarding Brief",
      };
      const reportTitle = titleMap[input.reportType as string] ?? String(input.reportType);

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
               WHERE client_id = $1 AND resolved_at IS NULL`,
              [clientId]
            );
            const t = taskResult.rows[0];
            const r = riskResult.rows[0];
            contextBlock = `\n\nMonthly status context:\n- Open tasks: ${t?.open_count ?? 0}\n- Tasks completed in last 30 days: ${t?.completed_this_month ?? 0}\n- Active risk alerts: ${r?.active_risks ?? 0}`;
          } else if (reportType === "risk_summary") {
            const risksResult = await query(
              `SELECT title, severity, detail FROM risk_alerts
               WHERE client_id = $1 AND resolved_at IS NULL
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
          result: `Report "${reportTitle}" created for ${input.clientName as string}. Now write the full "${reportTitle}" report in professional markdown for a financial advisor audience.${contextBlock}\n\nUse all available context to produce a thorough, actionable report. Structure it clearly with headers, bullet points where appropriate, and a concise executive summary at the top.`,
          action: { type: "report_generated", ...input, clientId, reportTitle },
        };
      } catch (err) {
        console.error("generate_report DB error:", err);
        return {
          success: true,
          result: `Now write the full "${reportTitle}" report in professional markdown for ${input.clientName as string}.${contextBlock}\n\nStructure it clearly with headers and a concise executive summary at the top.`,
          action: { type: "report_generated", ...input, reportTitle },
        };
      }
    }

    case "update_instrument_status": {
      try {
        let clientId: string | null = activeClientId ?? null;
        if (input.clientName) {
          const found = await findClientByName(input.clientName as string, advisorId);
          if (found) clientId = found;
        }

        if (!clientId) {
          return {
            success: false,
            result: `Could not resolve client "${input.clientName ?? "(none)"}". Instrument status not updated.`,
          };
        }

        const result = await query(
          `UPDATE instruments SET status = $1
           WHERE client_id = $2 AND name ILIKE $3
           RETURNING id, name, status`,
          [input.newStatus, clientId, `%${input.instrumentName}%`]
        );

        if (result.rows.length === 0) {
          return {
            success: false,
            result: `Instrument "${input.instrumentName}" not found for ${input.clientName}.`,
            action: { type: "instrument_not_found" },
          };
        }

        return {
          success: true,
          result: `Instrument "${result.rows[0].name}" for ${input.clientName} updated to "${input.newStatus}"`,
          action: { type: "instrument_updated", instrumentId: result.rows[0].id, ...input },
        };
      } catch (err) {
        console.error("update_instrument_status DB error:", err);
        return { success: false, result: "Failed to update instrument status." };
      }
    }

    case "flag_risk": {
      let clientId: string | null = activeClientId ?? null;
      if (input.clientName) {
        const found = await findClientByName(input.clientName as string, advisorId);
        if (found) clientId = found;
      }

      if (!clientId) {
        return {
          success: false,
          result: `Could not resolve client "${input.clientName ?? "(none)"}". Risk alert not saved.`,
        };
      }

      try {
        const result = await query(
          `INSERT INTO risk_alerts (client_id, title, detail, severity)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [clientId, input.title, input.detail ?? null, input.severity ?? "info"]
        );
        return {
          success: true,
          result: `Risk alert "${input.title}" flagged as ${input.severity} for ${input.clientName}: ${input.detail ?? ""}`,
          action: { type: "risk_flagged", alertId: result.rows[0].id, ...input, clientId },
        };
      } catch (err) {
        console.error("flag_risk DB error:", err);
        return { success: false, result: "Failed to save risk alert to database." };
      }
    }

    case "schedule_meeting": {
      let clientId: string | null = activeClientId ?? null;
      if (input.clientName) {
        const found = await findClientByName(input.clientName as string, advisorId);
        if (found) clientId = found;
      }

      if (!clientId) {
        return {
          success: false,
          result: `Could not resolve client "${input.clientName ?? "(none)"}". Meeting not scheduled.`,
        };
      }

      try {
        const result = await query(
          `INSERT INTO meetings (client_id, meeting_type, scheduled_date, notes, status)
           VALUES ($1, $2, $3, $4, 'scheduled') RETURNING id`,
          [clientId, input.meetingType, input.date, input.notes ?? null]
        );
        return {
          success: true,
          result: `${input.meetingType} meeting scheduled with ${input.clientName} for ${input.date}. ${input.notes ?? ""}`,
          action: { type: "meeting_scheduled", meetingId: result.rows[0].id, ...input, clientId },
        };
      } catch (err) {
        console.error("schedule_meeting DB error:", err);
        return { success: false, result: "Failed to save meeting to database." };
      }
    }

    case "get_meeting_agenda": {
      let clientId = activeClientId ?? null;
      if (input.clientName) {
        const found = await findClientByName(input.clientName as string, advisorId);
        if (found) clientId = found;
      }
      if (!clientId) {
        return {
          success: false,
          result: `Could not resolve client "${input.clientName ?? "(none)"}". No agenda lookup possible.`,
          action: { type: "agenda_lookup_failed", reason: "client_not_found" },
        };
      }

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
            result: `No matching meeting found for ${input.clientName as string}.`,
            action: { type: "agenda_not_found", reason: "meeting_not_found" },
          };
        }

        const dateIso = meetingRow.date ?? "no date";

        if (!meetingRow.agenda || meetingRow.agenda_status === "none" || !meetingRow.agenda_status) {
          return {
            success: true,
            result: `Meeting found: ${meetingRow.type ?? "Meeting"} on ${dateIso} for ${input.clientName as string}. STATUS: NO AGENDA HAS BEEN LOGGED for this meeting. You may suggest topics for the advisor to consider — but you MUST explicitly label them as "suggested" or "proposed", and never present them as if they were the actual agenda.`,
            action: {
              type: "agenda_retrieved",
              meetingId: meetingRow.id,
              status: "none",
            },
          };
        }

        let sections: Array<{ title: string; items: Array<string | { text: string; source?: string }> }>;
        try {
          sections = JSON.parse(meetingRow.agenda);
        } catch {
          return {
            success: false,
            result: `Agenda data for meeting ${meetingRow.id} could not be parsed. Treat this as no agenda available.`,
            action: { type: "agenda_parse_error", meetingId: meetingRow.id },
          };
        }

        const agendaMd = sections
          .map((s, i) => {
            const items = s.items
              .map((it) => {
                const text = typeof it === "string" ? it : it.text;
                const source = typeof it === "string" ? null : it.source;
                return `  - ${text}${source ? `\n    Context: ${source}` : ""}`;
              })
              .join("\n");
            return `${i + 1}. ${s.title}\n${items}`;
          })
          .join("\n\n");

        const statusLabel =
          meetingRow.agenda_status === "final" ? "FINAL (locked)" : "DRAFT";

        return {
          success: true,
          result: `Meeting: ${meetingRow.type ?? "Meeting"} on ${dateIso} for ${input.clientName as string}.\nAgenda status: ${statusLabel}\n\nAgenda items:\n${agendaMd}\n\nPresent this agenda to the advisor as-is. Do not invent additional items or replace it with task-derived suggestions.`,
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

    case "generate_engagement_briefing": {
      let clientId = activeClientId ?? null;
      if (input.clientName) {
        const found = await findClientByName(input.clientName as string, advisorId);
        if (found) clientId = found;
      }

      if (!clientId) {
        return {
          success: false,
          result: `Briefing not generated: could not resolve client "${input.clientName ?? "(none)"}". Please specify a valid client name.`,
          action: { type: "briefing_failed", reason: "client_not_found" },
        };
      }

      try {
        await query(
          `INSERT INTO deliverables (client_id, title, status, engine)
           VALUES ($1, $2, 'ready', 'Copilot')
           ON CONFLICT DO NOTHING`,
          [clientId, `Engagement Briefing — ${input.clientName as string}`]
        );
        return {
          success: true,
          result: `Engagement briefing created for ${input.clientName as string}. Now write the full structured briefing in markdown covering: client overview, Six Keys snapshot, current quarter state, open tasks, recent progress, risk alerts, stakeholders, last 3 meetings, and what to watch. Use all context available.`,
          action: {
            type: "briefing_generated",
            clientId,
            clientName: input.clientName,
          },
        };
      } catch (err) {
        console.error("generate_engagement_briefing DB error:", err);
        return {
          success: true,
          result: `Now write the full engagement briefing for ${input.clientName as string} in markdown covering: client overview, Six Keys snapshot, current quarter state, open tasks, recent progress, risk alerts, stakeholders, last 3 meetings, and what to watch.`,
          action: { type: "briefing_generated", clientName: input.clientName },
        };
      }
    }

    default:
      return { success: false, result: `Unknown tool: ${name}` };
  }
}

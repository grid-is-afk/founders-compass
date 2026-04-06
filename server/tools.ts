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
      "Generate a professional advisory report or memo. Use when the advisor asks to draft, create, or generate a document like a Capital Readiness Memo, Client Brief, Risk Summary, Board Update, or Assessment Summary.",
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
          ],
          description: "Type of report",
        },
        clientName: { type: "string", description: "Client the report is for" },
        format: {
          type: "string",
          enum: ["markdown", "pdf"],
          description: "Output format",
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
      };
      const reportTitle = titleMap[input.reportType as string] ?? String(input.reportType);

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
          result: `Report "${reportTitle}" generated for ${input.clientName}. The report is ready for review and download.`,
          action: { type: "report_generated", ...input, clientId },
        };
      } catch (err) {
        console.error("generate_report DB error:", err);
        return {
          success: true,
          result: `Report "${reportTitle}" generated for ${input.clientName}. (Note: deliverable record not saved.)`,
          action: { type: "report_generated", ...input },
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

    default:
      return { success: false, result: `Unknown tool: ${name}` };
  }
}

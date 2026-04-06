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

export function executeTool(
  name: string,
  input: Record<string, unknown>
): { success: boolean; result: string; action?: Record<string, unknown> } {
  switch (name) {
    case "create_task":
      return {
        success: true,
        result: `Task "${input.title}" created for ${input.clientName || "current client"}, assigned to ${input.assignee}, priority: ${input.priority}, due: ${input.dueDate || "TBD"}`,
        action: { type: "task_created", ...input },
      };
    case "move_prospect":
      return {
        success: true,
        result: `Prospect "${input.prospectName}" moved to ${input.newStatus}. ${input.notes || ""}`,
        action: { type: "prospect_moved", ...input },
      };
    case "generate_report":
      return {
        success: true,
        result: `Report "${input.reportType}" generated for ${input.clientName}. The report is ready for review and download.`,
        action: { type: "report_generated", ...input },
      };
    case "update_instrument_status":
      return {
        success: true,
        result: `Instrument "${input.instrumentName}" for ${input.clientName} updated to "${input.newStatus}"`,
        action: { type: "instrument_updated", ...input },
      };
    case "flag_risk":
      return {
        success: true,
        result: `Risk alert "${input.title}" flagged as ${input.severity} for ${input.clientName}: ${input.detail || ""}`,
        action: { type: "risk_flagged", ...input },
      };
    case "schedule_meeting":
      return {
        success: true,
        result: `${input.meetingType} meeting scheduled with ${input.clientName} for ${input.date}. ${input.notes || ""}`,
        action: { type: "meeting_scheduled", ...input },
      };
    default:
      return { success: false, result: `Unknown tool: ${name}` };
  }
}

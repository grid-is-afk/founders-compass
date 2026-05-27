import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";
import { tools, executeTool } from "../tools.js";
import { saveReportToDataRoom } from "../lib/saveReport.js";
import type { SaveReportResult } from "../lib/saveReport.js";
import { getPhaseForQuarter } from "../methodology/tfo-methodology.js";
import { buildDeliverableDocx, buildDeliverableFilename } from "../lib/deliverableDocx.js";

const router = Router();

const ALLOWED_COLUMNS = new Set(["title", "status", "engine", "review_status", "content"]);

const verifyClient = verifyClientAccess;

// GET /api/deliverables?client_id=xxx
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClient(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      "SELECT * FROM deliverables WHERE client_id = $1 AND archived_at IS NULL ORDER BY created_at",
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /deliverables error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/deliverables
router.post("/", async (req, res) => {
  const { client_id, title, status, engine } = req.body;
  if (!client_id || !title) {
    return res.status(400).json({ error: "client_id and title required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO deliverables (client_id, title, status, engine)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [client_id, title, status ?? "pending", engine ?? null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /deliverables error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/deliverables/generate-quarterly-review
router.post("/generate-quarterly-review", async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: "clientId required" });
  }

  const advisorId = req.user!.id;

  try {
    if (!(await verifyClient(clientId, advisorId, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const clientResult = await query(
      "SELECT name FROM clients WHERE id = $1",
      [clientId]
    );
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    const clientName: string = clientResult.rows[0].name;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const generateReportTool = tools.find((t) => t.name === "generate_report")!;

    const userMessage = `Generate a Quarterly Review report for ${clientName}. Save it to the Quarterly Review subfolder under Reports.`;

    // First turn — let Claude call generate_report tool
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system:
        "You are QB AI, a financial advisor copilot. When asked to generate a quarterly review, immediately call the generate_report tool with reportType 'quarterly_review', then write the full report content in markdown. Do not ask clarifying questions.",
      messages: [{ role: "user", content: userMessage }],
      tools: [generateReportTool as Anthropic.Tool],
    });

    let textContent = "";

    // Tool-use loop — same pattern as the main chat endpoint
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          advisorId,
          clientId
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.result,
        });
      }

      // Feed tool results back; Claude writes the actual report in its next response
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system:
          "You are QB AI, a financial advisor copilot. When asked to generate a quarterly review, immediately call the generate_report tool with reportType 'quarterly_review', then write the full report content in markdown. Do not ask clarifying questions.",
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
        tools: [generateReportTool as Anthropic.Tool],
      });
    }

    // Capture Claude's final text as the report body
    for (const block of response.content) {
      if (block.type === "text") textContent += block.text;
    }

    // Fetch (or confirm) the deliverable row created by executeTool
    const delResult = await query(
      `SELECT * FROM deliverables
       WHERE client_id = $1 AND title = 'Quarterly Review'
       ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    );
    const savedRow = delResult.rows[0] ?? null;

    if (!savedRow) {
      console.error("generate-quarterly-review: tool returned no matching deliverable row");
      return res.status(500).json({ error: "Failed to retrieve generated deliverable" });
    }

    // Preserve review_status if already set (e.g. already 'approved'); default to
    // 'pending_review' only for first generation. Regeneration of an approved
    // doc keeps the approval so the Data Room file stays at its clean name.
    const reviewStatusResult = await query(
      `UPDATE deliverables
       SET review_status = COALESCE(review_status, 'pending_review'),
           updated_at = NOW()
       WHERE id = $1
       RETURNING review_status`,
      [savedRow.id]
    );
    savedRow.review_status = reviewStatusResult.rows[0].review_status;

    // Save .docx to Data Room (UPSERT — one row per deliverable). Filename
    // suffix mirrors the live review_status so an approved doc keeps its
    // clean name on regenerate.
    let dataRoom: SaveReportResult = { saved: false, wasUpdate: false, name: "" };
    try {
      const generatedAt = new Date().toISOString().slice(0, 10);
      const docxBuffer = await buildDeliverableDocx({
        title: savedRow.title,
        clientName,
        generatedAt,
        markdownContent: textContent,
      });
      dataRoom = await saveReportToDataRoom({
        clientId,
        baseTitle: `Quarterly Review — ${clientName}`,
        contentBuffer: docxBuffer,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        extension: "docx",
        deliverableId: savedRow.id,
        reviewStatus: savedRow.review_status as "pending_review" | "approved",
        category: "Quarterly Review",
      });
    } catch (drErr) {
      console.error("Data Room save failed for generate-quarterly-review:", drErr);
      dataRoom = {
        saved: false,
        wasUpdate: false,
        name: "",
        error: drErr instanceof Error ? drErr.message : "Unknown error",
      };
    }

    return res.status(201).json({ deliverable: savedRow, dataRoom });
  } catch (err) {
    console.error("POST /deliverables/generate-quarterly-review error:", err);
    return res.status(500).json({ error: "Report generation failed" });
  }
});

// POST /api/deliverables/generate-engagement-briefing
router.post("/generate-engagement-briefing", async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: "clientId required" });
  }

  const advisorId = req.user!.id;

  try {
    if (!(await verifyClient(clientId, advisorId, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const clientResult = await query(
      "SELECT name FROM clients WHERE id = $1",
      [clientId]
    );
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    const clientName: string = clientResult.rows[0].name;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const briefingTool = tools.find((t) => t.name === "generate_engagement_briefing")!;

    const userMessage = `Generate an engagement briefing for ${clientName}. Use all available client context to produce a thorough structured briefing.`;

    // First turn — let Claude call generate_engagement_briefing tool
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system:
        "You are QB AI, a financial advisor copilot. When asked to generate an engagement briefing, immediately call the generate_engagement_briefing tool, then write the full briefing in structured markdown. Include all sections: client overview, Six Keys snapshot, current quarter, open tasks, recent progress, risk alerts, stakeholders, last 3 meetings, and what to watch. Do not ask clarifying questions.",
      messages: [{ role: "user", content: userMessage }],
      tools: [briefingTool as Anthropic.Tool],
    });

    let textContent = "";

    // Tool-use loop — same pattern as generate-quarterly-review
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          advisorId,
          clientId
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.result,
        });
      }

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system:
          "You are QB AI, a financial advisor copilot. When asked to generate an engagement briefing, immediately call the generate_engagement_briefing tool, then write the full briefing in structured markdown. Include all sections: client overview, Six Keys snapshot, current quarter, open tasks, recent progress, risk alerts, stakeholders, last 3 meetings, and what to watch. Do not ask clarifying questions.",
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
        tools: [briefingTool as Anthropic.Tool],
      });
    }

    // Capture Claude's final text as the briefing body
    for (const block of response.content) {
      if (block.type === "text") textContent += block.text;
    }

    const briefingTitle = `Engagement Briefing — ${clientName}`;

    // Fetch the deliverable row created by the tool handler
    const delResult = await query(
      `SELECT * FROM deliverables
       WHERE client_id = $1 AND title = $2
       ORDER BY created_at DESC LIMIT 1`,
      [clientId, briefingTitle]
    );
    const savedRow = delResult.rows[0] ?? null;

    if (!savedRow) {
      console.error("generate-engagement-briefing: tool returned no matching deliverable row");
      return res.status(500).json({ error: "Failed to retrieve generated deliverable" });
    }

    // Preserve existing review_status (e.g. 'approved'); only default new rows
    // to 'pending_review'.
    const reviewStatusResult = await query(
      `UPDATE deliverables
       SET review_status = COALESCE(review_status, 'pending_review'),
           updated_at = NOW()
       WHERE id = $1
       RETURNING review_status`,
      [savedRow.id]
    );
    savedRow.review_status = reviewStatusResult.rows[0].review_status;

    // Save .docx to Data Room (UPSERT keyed on deliverable_id)
    let dataRoom: SaveReportResult = { saved: false, wasUpdate: false, name: "" };
    try {
      const generatedAt = new Date().toISOString().slice(0, 10);
      const docxBuffer = await buildDeliverableDocx({
        title: savedRow.title,
        clientName,
        generatedAt,
        markdownContent: textContent,
      });
      dataRoom = await saveReportToDataRoom({
        clientId,
        baseTitle: briefingTitle,
        contentBuffer: docxBuffer,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        extension: "docx",
        deliverableId: savedRow.id,
        reviewStatus: savedRow.review_status as "pending_review" | "approved",
        category: "Reports",
      });
    } catch (drErr) {
      console.error("Data Room save failed for generate-engagement-briefing:", drErr);
      dataRoom = {
        saved: false,
        wasUpdate: false,
        name: "",
        error: drErr instanceof Error ? drErr.message : "Unknown error",
      };
    }

    return res.status(201).json({ deliverable: savedRow, dataRoom });
  } catch (err) {
    console.error("POST /deliverables/generate-engagement-briefing error:", err);
    return res.status(500).json({ error: "Briefing generation failed" });
  }
});

// POST /api/deliverables/generate-review-prep
router.post("/generate-review-prep", async (req, res) => {
  const { clientId, quarter } = req.body as { clientId?: string; quarter?: number };

  if (!clientId || quarter === undefined || quarter === null) {
    return res.status(400).json({ error: "clientId and quarter required" });
  }

  const advisorId = req.user!.id;

  try {
    if (!(await verifyClientAccess(clientId, advisorId, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    // -----------------------------------------------------------------------
    // 1. Fetch client record
    // -----------------------------------------------------------------------
    const clientResult = await query(
      "SELECT name, onboarded_at, current_quarter, current_year FROM clients WHERE id = $1",
      [clientId]
    );
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    const client = clientResult.rows[0] as {
      name: string;
      onboarded_at: string | null;
      current_quarter: number | null;
      current_year: number | null;
    };
    const clientName = client.name;
    const effectiveQuarter = quarter;

    // -----------------------------------------------------------------------
    // 2. Compute quarter date range from onboarded_at
    //    Q1 = onboarded_at + 0–89d, Q2 = +90–179d, etc.
    // -----------------------------------------------------------------------
    let quarterStart: Date | null = null;
    let quarterEnd: Date | null = null;
    if (client.onboarded_at) {
      const onboarded = new Date(client.onboarded_at);
      const offsetDays = (effectiveQuarter - 1) * 90;
      quarterStart = new Date(onboarded.getTime() + offsetDays * 86400000);
      quarterEnd = new Date(quarterStart.getTime() + 89 * 86400000);
    }

    // -----------------------------------------------------------------------
    // 3. Fetch all tasks for the client
    // -----------------------------------------------------------------------
    const tasksResult = await query(
      "SELECT title, status, due_date, created_at FROM tasks WHERE client_id = $1 ORDER BY created_at",
      [clientId]
    );
    interface TaskRow {
      title: string;
      status: string;
      due_date: string | null;
      created_at: string;
    }
    const allTasks = tasksResult.rows as TaskRow[];
    const now = new Date();

    const completedTasks = allTasks.filter((t) => t.status === "done");
    const openTasks = allTasks.filter((t) => t.status !== "done");
    const overdueTasks = openTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now
    );
    // Tasks added after quarter start (mid-quarter additions)
    const midQuarterTasks =
      quarterStart
        ? allTasks.filter((t) => new Date(t.created_at) > quarterStart!)
        : [];

    // -----------------------------------------------------------------------
    // 4. Fetch current quarterly plan (review_date + status)
    // -----------------------------------------------------------------------
    const planResult = await query(
      `SELECT quarter, year, status, review_date, label
       FROM quarterly_plans
       WHERE client_id = $1 AND quarter = $2
       ORDER BY created_at DESC LIMIT 1`,
      [clientId, effectiveQuarter]
    );
    interface PlanRow {
      quarter: number;
      year: number;
      status: string;
      review_date: string | null;
      label: string | null;
    }
    const currentPlan: PlanRow | null = planResult.rows[0] ?? null;

    // -----------------------------------------------------------------------
    // 5. Fetch active risk alerts (limit 5)
    // -----------------------------------------------------------------------
    const alertsResult = await query(
      `SELECT title, severity
       FROM risk_alerts
       WHERE client_id = $1 AND resolved = FALSE
       ORDER BY
         CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         created_at DESC
       LIMIT 5`,
      [clientId]
    );
    interface AlertRow { title: string; severity: string; }
    const activeAlerts = alertsResult.rows as AlertRow[];

    // -----------------------------------------------------------------------
    // 6. Fetch Six Keys scores (latest entry)
    // -----------------------------------------------------------------------
    const sixKeysResult = await query(
      `SELECT clarity, alignment, structure, stewardship, velocity, legacy, completed_at
       FROM client_six_keys
       WHERE client_id = $1
       ORDER BY completed_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [clientId]
    );
    interface SixKeysRow {
      clarity: number | null;
      alignment: number | null;
      structure: number | null;
      stewardship: number | null;
      velocity: number | null;
      legacy: number | null;
      completed_at: string | null;
    }
    const sixKeys: SixKeysRow | null = sixKeysResult.rows[0] ?? null;

    // -----------------------------------------------------------------------
    // 7. Fetch last quarter's deliverables (if Q > 1)
    // -----------------------------------------------------------------------
    interface DeliverableRow { title: string; status: string; }
    let priorDeliverables: DeliverableRow[] = [];
    if (effectiveQuarter > 1) {
      const priorResult = await query(
        `SELECT title, status
         FROM deliverables
         WHERE client_id = $1
           AND created_at < $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [clientId, quarterStart ?? now]
      );
      priorDeliverables = priorResult.rows as DeliverableRow[];
    }

    // -----------------------------------------------------------------------
    // 8. Resolve methodology phase
    // -----------------------------------------------------------------------
    const phase = getPhaseForQuarter(effectiveQuarter);
    const phaseName = phase?.name ?? "Unknown";
    const phaseObjective = phase?.objective ?? "";
    const requiredActivities = phase?.activities
      .filter((a) => a.isRequired)
      .map((a) => a.name)
      .join(", ") ?? "";

    // -----------------------------------------------------------------------
    // 9. Build context string for Claude
    // -----------------------------------------------------------------------
    const reviewDateStr = currentPlan?.review_date
      ? new Date(currentPlan.review_date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "TBD";

    const todayStr = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const sixKeysStr = sixKeys
      ? `Clarity: ${sixKeys.clarity ?? "—"}/100 | Alignment: ${sixKeys.alignment ?? "—"}/100 | ` +
        `Structure: ${sixKeys.structure ?? "—"}/100 | Stewardship: ${sixKeys.stewardship ?? "—"}/100 | ` +
        `Velocity: ${sixKeys.velocity ?? "—"}/100 | Legacy: ${sixKeys.legacy ?? "—"}/100` +
        (sixKeys.completed_at ? ` (scored ${new Date(sixKeys.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})` : "")
      : "No Six Keys scores on file yet.";

    const alertsStr = activeAlerts.length > 0
      ? activeAlerts.map((a) => `- [${a.severity.toUpperCase()}] ${a.title}`).join("\n")
      : "No active risk alerts.";

    const completedStr = completedTasks.length > 0
      ? completedTasks.map((t) => `- ${t.title}`).join("\n")
      : "No completed tasks this quarter.";

    const overdueStr = overdueTasks.length > 0
      ? overdueTasks.map((t) => `- ${t.title} (due ${t.due_date})`).join("\n")
      : "No overdue tasks.";

    const midQuarterStr =
      midQuarterTasks.length > 0 && quarterStart
        ? midQuarterTasks.map((t) => `- ${t.title}`).join("\n")
        : "No tasks added mid-quarter.";

    const priorStr = priorDeliverables.length > 0
      ? priorDeliverables.map((d) => `- ${d.title} (${d.status})`).join("\n")
      : "No prior-quarter deliverables on record.";

    const contextBlock = `
CLIENT: ${clientName}
QUARTER: Q${effectiveQuarter} | METHODOLOGY PHASE: ${phaseName}
PHASE OBJECTIVE: ${phaseObjective}
REQUIRED ACTIVITIES THIS PHASE: ${requiredActivities}
REVIEW DATE: ${reviewDateStr}
PREPARED: ${todayStr}

=== TASKS — COMPLETED ===
${completedStr}

=== TASKS — OVERDUE / INCOMPLETE ===
${overdueStr}

=== TASKS — ADDED MID-QUARTER ===
${midQuarterStr}

=== SIX KEYS OF CAPITAL™ SCORES ===
${sixKeysStr}

=== ACTIVE RISK ALERTS ===
${alertsStr}

=== PRIOR QUARTER DELIVERABLES (for reference) ===
${priorStr}
`.trim();

    // -----------------------------------------------------------------------
    // 10. Call Claude to generate the review prep document
    // -----------------------------------------------------------------------
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are QB AI, a strategic advisor copilot for The Founders Office™ engagement model.
Your job is to generate a quarterly review prep document for an advisor, using the structured client context provided.
Write in clear, professional language suited for a high-trust advisor-founder relationship.
Be specific and data-grounded — reference actual tasks, scores, and alerts from the context.
Do not invent information not present in the context. If a section has no data, say so briefly.
Output pure markdown only — no preamble, no explanation outside the document itself.`;

    const userMessage = `Generate the Q${effectiveQuarter} Review Prep document for ${clientName} using the context below.

${contextBlock}

The document MUST follow this exact structure:

# Q${effectiveQuarter} Review Prep — ${clientName}
*Prepared ${todayStr} | Ready for review on ${reviewDateStr}*

## Quarter in Review
### What Was Accomplished
[Summarize completed tasks — group thematically if possible, highlight outcomes]

### What Slipped
[Summarize overdue and incomplete items — note patterns or root causes if apparent]

### What Was Added Mid-Quarter
[Note tasks that emerged after the quarter started — reflect on whether they distracted from the original plan]

## Progress Snapshot
[Summarize Six Keys movement if scores are available. Note active risk alerts and their implications.]

## Recommended Objectives for Q${effectiveQuarter + 1}
[List 3–5 specific, actionable objectives grounded in the ${phaseName} phase methodology, the client's current trajectory, and what slipped this quarter. Each objective should be one sentence.]

## Suggested Agenda for the Review Meeting
[List 5–7 agenda items in order, as short bullet points. Should flow logically from review → reflection → planning → commitment.]`;

    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    let docContent = "";
    for (const block of aiResponse.content) {
      if (block.type === "text") docContent += block.text;
    }

    // -----------------------------------------------------------------------
    // 11. Save as a deliverable — UPDATE existing prep doc for this quarter if
    //     one already exists (regeneration), otherwise INSERT a new row.
    // -----------------------------------------------------------------------
    const deliverableTitle = `Q${effectiveQuarter} Review Prep — ${clientName}`;
    const titlePattern = `Q${effectiveQuarter} Review Prep%`;

    const existingPrep = await query(
      `SELECT id FROM deliverables
       WHERE client_id = $1 AND title LIKE $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [clientId, titlePattern]
    );

    let savedRow;
    if (existingPrep.rows.length > 0) {
      // Regeneration — preserve existing review_status (so re-running on an
      // approved doc doesn't silently revoke approval).
      const updateResult = await query(
        `UPDATE deliverables
         SET title = $1, status = 'ready', engine = 'claude-sonnet-4-6',
             content = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [deliverableTitle, docContent, existingPrep.rows[0].id]
      );
      savedRow = updateResult.rows[0];
    } else {
      const insertResult = await query(
        `INSERT INTO deliverables (client_id, title, status, engine, content, review_status)
         VALUES ($1, $2, $3, $4, $5, 'pending_review') RETURNING *`,
        [clientId, deliverableTitle, "ready", "claude-sonnet-4-6", docContent]
      );
      savedRow = insertResult.rows[0];
    }

    // Save .docx to Data Room (UPSERT keyed on deliverable_id). Filename suffix
    // mirrors the live review_status — approved docs stay at their clean name.
    let dataRoom: SaveReportResult = { saved: false, wasUpdate: false, name: "" };
    try {
      const generatedAt = new Date().toISOString().slice(0, 10);
      const docxBuffer = await buildDeliverableDocx({
        title: savedRow.title,
        clientName,
        generatedAt,
        markdownContent: docContent,
      });
      dataRoom = await saveReportToDataRoom({
        clientId,
        baseTitle: deliverableTitle,
        contentBuffer: docxBuffer,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        extension: "docx",
        deliverableId: savedRow.id,
        reviewStatus: savedRow.review_status as "pending_review" | "approved",
        category: "Reports",
      });
    } catch (drErr) {
      console.error("Data Room save failed for generate-review-prep:", drErr);
      dataRoom = {
        saved: false,
        wasUpdate: false,
        name: "",
        error: drErr instanceof Error ? drErr.message : "Unknown error",
      };
    }

    return res.status(201).json({ deliverable: savedRow, dataRoom });
  } catch (err) {
    console.error("POST /deliverables/generate-review-prep error:", err);
    return res.status(500).json({ error: "Review prep generation failed" });
  }
});

// ── GET /api/deliverables/:id/document.docx ─────────────────────────────────
// Download a deliverable as a Word-compatible .docx file.
router.get("/:id/document.docx", async (req, res) => {
  try {
    const dResult = await query(
      "SELECT * FROM deliverables WHERE id = $1",
      [req.params.id]
    );
    if (dResult.rows.length === 0) {
      return res.status(404).json({ error: "Deliverable not found" });
    }

    const deliverable = dResult.rows[0] as {
      id: string;
      client_id: string;
      title: string;
      content: string | null;
      created_at: string;
      updated_at: string;
    };

    if (!(await verifyClient(deliverable.client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!deliverable.content) {
      return res.status(404).json({ error: "Deliverable not yet generated" });
    }

    const clientResult = await query("SELECT name FROM clients WHERE id = $1", [deliverable.client_id]);
    const clientName = (clientResult.rows[0]?.name as string | undefined) ?? "Client";

    const generatedAt = deliverable.updated_at
      ? new Date(deliverable.updated_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const buffer = await buildDeliverableDocx({
      title: deliverable.title,
      clientName,
      generatedAt,
      markdownContent: deliverable.content,
    });

    const filename = buildDeliverableFilename(deliverable.title, clientName, generatedAt);
    // RFC 6266: ASCII fallback + UTF-8 percent-encoded for non-ASCII characters
    // (em-dashes etc.) so Safari + strict proxies don't garble the filename.
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader("Content-Length", buffer.length.toString());
    return res.end(buffer);
  } catch (err) {
    console.error("GET /deliverables/:id/document.docx error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/deliverables/:id
router.patch("/:id", async (req, res) => {
  const raw = req.body;
  const fields: Record<string, unknown> = {};
  for (const k of Object.keys(raw)) {
    if (ALLOWED_COLUMNS.has(k)) fields[k] = raw[k];
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const dResult = await query("SELECT * FROM deliverables WHERE id = $1", [
      req.params.id,
    ]);
    if (dResult.rows.length === 0) {
      return res.status(404).json({ error: "Deliverable not found" });
    }
    if (!(await verifyClient(dResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE deliverables SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    const updatedRow = result.rows[0];

    // If review_status was changed, rename the linked Data Room document
    let dataRoomRenamed = false;
    if ("review_status" in fields) {
      const newStatus = fields.review_status as string;
      const docResult = await query(
        "SELECT id, name FROM documents WHERE deliverable_id = $1 LIMIT 1",
        [req.params.id]
      );
      if (docResult.rows.length > 0) {
        const docRow = docResult.rows[0] as { id: string; name: string };
        let newName: string;
        if (newStatus === "approved") {
          // Strip "(Pending Review)" suffix if present
          newName = docRow.name.replace(/ \(Pending Review\)(\.[^.]+)$/, "$1");
        } else {
          // pending_review — ensure suffix is present (don't double-append)
          const hasExtMatch = docRow.name.match(/(\.[^.]+)$/);
          const ext = hasExtMatch ? hasExtMatch[1] : "";
          const baseName = ext ? docRow.name.slice(0, -ext.length) : docRow.name;
          const cleanBase = baseName.replace(/ \(Pending Review\)$/, "");
          newName = `${cleanBase} (Pending Review)${ext}`;
        }
        await query(
          "UPDATE documents SET name = $1, updated_at = NOW() WHERE id = $2",
          [newName, docRow.id]
        );
        dataRoomRenamed = true;
      }
    }

    return res.json({ ...updatedRow, dataRoomRenamed });
  } catch (err) {
    console.error("PATCH /deliverables/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/deliverables/:id/archive ──────────────────────────────────────
// Soft-delete a deliverable + mirror to the linked Data Room document.
router.post("/:id/archive", async (req, res) => {
  try {
    const dResult = await query(
      "SELECT id, client_id FROM deliverables WHERE id = $1",
      [req.params.id]
    );
    if (dResult.rows.length === 0) {
      return res.status(404).json({ error: "Deliverable not found" });
    }
    if (!(await verifyClient(dResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query(
      `UPDATE deliverables SET archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    // Mirror to the linked Data Room document (if any). ON DELETE CASCADE on
    // deliverable_id would handle hard delete; for archive we set the same flag.
    const docResult = await query(
      `UPDATE documents SET archived_at = NOW(), updated_at = NOW()
       WHERE deliverable_id = $1
       RETURNING id`,
      [req.params.id]
    );

    return res.json({ ok: true, dataRoomArchived: docResult.rows.length > 0 });
  } catch (err) {
    console.error("POST /deliverables/:id/archive error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/deliverables/:id/unarchive ────────────────────────────────────
// Restore a previously archived deliverable + its Data Room document.
router.post("/:id/unarchive", async (req, res) => {
  try {
    const dResult = await query(
      "SELECT id, client_id FROM deliverables WHERE id = $1",
      [req.params.id]
    );
    if (dResult.rows.length === 0) {
      return res.status(404).json({ error: "Deliverable not found" });
    }
    if (!(await verifyClient(dResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query(
      `UPDATE deliverables SET archived_at = NULL, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    const docResult = await query(
      `UPDATE documents SET archived_at = NULL, updated_at = NOW()
       WHERE deliverable_id = $1
       RETURNING id`,
      [req.params.id]
    );

    return res.json({ ok: true, dataRoomRestored: docResult.rows.length > 0 });
  } catch (err) {
    console.error("POST /deliverables/:id/unarchive error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/deliverables/:id
router.delete("/:id", async (req, res) => {
  try {
    const dResult = await query("SELECT * FROM deliverables WHERE id = $1", [
      req.params.id,
    ]);
    if (dResult.rows.length === 0) {
      return res.status(404).json({ error: "Deliverable not found" });
    }
    if (!(await verifyClient(dResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM deliverables WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /deliverables/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

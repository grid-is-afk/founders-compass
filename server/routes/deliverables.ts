import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";
import { tools, executeTool } from "../tools.js";
import { saveReportToDataRoom } from "../lib/saveReport.js";

const router = Router();

const ALLOWED_COLUMNS = new Set(["title", "status", "engine", "review_status"]);

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
      "SELECT * FROM deliverables WHERE client_id = $1 ORDER BY created_at",
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

    // Save report markdown to Data Room under Reports > Quarterly Review
    await saveReportToDataRoom(clientId, "Quarterly Review", textContent, "Quarterly Review");

    // Return the deliverable record that was created by executeTool
    const delResult = await query(
      `SELECT id, title FROM deliverables
       WHERE client_id = $1 AND title = 'Quarterly Review'
       ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    );

    return res.json(delResult.rows[0] ?? { id: null, title: "Quarterly Review" });
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

    // Save briefing markdown to Data Room under Reports
    await saveReportToDataRoom(clientId, briefingTitle, textContent, "Reports");

    // Return the deliverable row created by the tool handler
    const delResult = await query(
      `SELECT id, title FROM deliverables
       WHERE client_id = $1 AND title = $2
       ORDER BY created_at DESC LIMIT 1`,
      [clientId, briefingTitle]
    );

    return res.json(delResult.rows[0] ?? { id: null, title: briefingTitle });
  } catch (err) {
    console.error("POST /deliverables/generate-engagement-briefing error:", err);
    return res.status(500).json({ error: "Briefing generation failed" });
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
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /deliverables/:id error:", err);
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

import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";
import { retrieveChunks } from "../lib/retrieval.js";
import { getPhaseForQuarter } from "../methodology/tfo-methodology.js";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ProposedTask {
  title: string;
  description: string;
  assignee: "advisor" | "client";
  priority: "high" | "medium" | "low";
  phase: string;
  rationale: string;
  sourceContext: string;
}

interface KickoffPlanResponse {
  tasks: ProposedTask[];
  clientName: string;
  phase: "Discover";
}

interface AlreadyHasTasksResponse {
  alreadyHasTasks: true;
  message: string;
}

// POST /api/clients/:id/kickoff-plan
router.post("/:id/kickoff-plan", async (req, res) => {
  const { id: clientId } = req.params;

  try {
    // 1. Verify the advisor has access to this client
    if (!(await verifyClientAccess(clientId, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    // 2. Fetch client name
    const clientResult = await query(
      `SELECT name FROM clients WHERE id = $1`,
      [clientId]
    );
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    const clientName = clientResult.rows[0].name as string;

    // 3. Check whether the client already has tasks
    const taskCountResult = await query(
      `SELECT COUNT(*) AS count FROM tasks WHERE client_id = $1`,
      [clientId]
    );
    const taskCount = Number(taskCountResult.rows[0]?.count ?? 0);
    if (taskCount > 0) {
      const response: AlreadyHasTasksResponse = {
        alreadyHasTasks: true,
        message: `${clientName} already has ${taskCount} task${taskCount !== 1 ? "s" : ""}. The kickoff plan generator is only available when no tasks exist yet.`,
      };
      return res.json(response);
    }

    // 4. Pull the Discover phase activities from the TFO methodology
    const discoverPhase = getPhaseForQuarter(1);
    if (!discoverPhase) {
      return res.status(500).json({ error: "Could not load TFO Discover phase methodology" });
    }

    const activitiesText = discoverPhase.activities
      .map(
        (a) =>
          `- ${a.name}: ${a.description}${a.isRequired ? " [REQUIRED]" : " [optional]"}` +
          `\n  Success indicator: ${a.successIndicator}`
      )
      .join("\n");

    // 5. Retrieve relevant document chunks from the client's data room via RAG
    let docContext = "";
    try {
      const chunks = await retrieveChunks(
        "engagement scope client objectives deliverables intake goals business overview",
        clientId,
        12
      );
      if (chunks.length > 0) {
        docContext =
          "\n\n## CLIENT DOCUMENT EXCERPTS (from Data Room)\n" +
          chunks
            .map(
              (c, i) =>
                `[Doc ${i + 1}: ${(c.metadata.document_name as string | undefined) ?? "Document"}]\n${c.chunk_text}`
            )
            .join("\n\n");
      }
    } catch (ragErr) {
      // Non-fatal — proceed without RAG context if retrieval fails
      console.warn("kickoff-plan RAG retrieval failed:", ragErr);
    }

    // 6. Call Claude to generate the kickoff task list
    const systemPrompt =
      "You are a TFO engagement planner. Based on the TFO Discover phase methodology and any " +
      "uploaded client documents, generate an initial Q1 kickoff task list for an advisor to review. " +
      "You will output ONLY a valid JSON array of task objects — no markdown, no prose, no explanation. " +
      "Do not wrap the JSON in code fences. Return the raw JSON array only.";

    const userMessage =
      `Generate a Q1 kickoff task plan for a new TFO client named "${clientName}".\n\n` +
      `## TFO Discover Phase — Activities\n${activitiesText}\n\n` +
      `## Phase Objective\n${discoverPhase.objective}\n\n` +
      `## Phase Success Criteria\n${discoverPhase.successCriteria.map((c) => `- ${c}`).join("\n")}` +
      docContext +
      `\n\n## Instructions\n` +
      `Create 6–10 specific, actionable tasks for the advisor and client to complete during Q1. ` +
      `Each task should map to one of the Discover phase activities above. ` +
      `Prioritize required activities. ` +
      `If client documents were provided above, use them to personalise task descriptions and rationale. ` +
      `\n\nReturn a JSON array where each element has exactly these fields:\n` +
      `{\n` +
      `  "title": "string — concise task title (max 80 chars)",\n` +
      `  "description": "string — 1–2 sentences explaining what needs to be done",\n` +
      `  "assignee": "advisor" or "client",\n` +
      `  "priority": "high", "medium", or "low",\n` +
      `  "phase": "string — the Discover phase activity name this task belongs to (e.g. 'Master Intake')",\n` +
      `  "rationale": "string — why this task matters for this engagement",\n` +
      `  "sourceContext": "string — excerpt from client docs that informed this task, or empty string if none"\n` +
      `}`;

    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // 7. Parse Claude's JSON response — strip any accidental markdown code fences
    const rawText =
      aiResponse.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "[]";

    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let tasks: ProposedTask[];
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("Claude did not return a JSON array");
      }
      // Coerce and validate each item — drop any that are missing required fields
      tasks = parsed
        .filter(
          (item): item is Record<string, unknown> =>
            item !== null && typeof item === "object"
        )
        .map((item) => ({
          title: String(item.title ?? "Untitled Task").slice(0, 80),
          description: String(item.description ?? ""),
          assignee:
            item.assignee === "client" ? ("client" as const) : ("advisor" as const),
          priority:
            item.priority === "high"
              ? ("high" as const)
              : item.priority === "low"
              ? ("low" as const)
              : ("medium" as const),
          phase: String(item.phase ?? "Discover"),
          rationale: String(item.rationale ?? ""),
          sourceContext: String(item.sourceContext ?? ""),
        }));
    } catch (parseErr) {
      console.error("kickoff-plan JSON parse error:", parseErr, "\nRaw text:", rawText);
      return res.status(500).json({ error: "Failed to parse AI-generated task list. Please try again." });
    }

    const responsePayload: KickoffPlanResponse = {
      tasks,
      clientName,
      phase: "Discover",
    };

    return res.json(responsePayload);
  } catch (err) {
    console.error("POST /api/clients/:id/kickoff-plan error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import pool, { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";
import { retrieveChunks } from "../lib/retrieval.js";
import { getPhaseForQuarter } from "../methodology/tfo-methodology.js";
import { computeDueDates, addDaysUTC } from "../lib/kickoffSchedule.js";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Default discovery window when the advisor doesn't specify one (matches the Discover phase typical duration). */
const DEFAULT_DISCOVERY_DAYS = 90;

const VALID_PRIORITIES = new Set(["high", "medium", "low"]);

export interface ProposedTask {
  title: string;
  description: string;
  assignee: "advisor" | "client";
  priority: "high" | "medium" | "low";
  phase: string;
  rationale: string;
  sourceContext: string;
  /** Methodology activity id this task maps to — drives back-scheduling. */
  activityId: string;
  /** Back-scheduled due date (YYYY-MM-DD); advisor may move it before applying. */
  dueDate: string | null;
}

interface KickoffPlanResponse {
  tasks: ProposedTask[];
  clientName: string;
  phase: "Discover";
  personalizationLevel: "full" | "methodology-only";
  startDate: string;
  durationDays: number;
  /** Number of existing kickoff-phase tasks — non-zero means applying will replace them. */
  existingKickoffCount: number;
}

interface NoScopeMaterialsResponse {
  noScopeMaterials: true;
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

    // 2. Fetch client name + onboarding date (the Q1 start the schedule anchors to)
    const clientResult = await query(
      `SELECT name, onboarded_at FROM clients WHERE id = $1`,
      [clientId]
    );
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    const clientName = clientResult.rows[0].name as string;
    const onboardedAt = clientResult.rows[0].onboarded_at as string | null;

    // 2b. Resolve the scheduling window from the request, with sensible defaults.
    //     startDate defaults to the client's onboarded_at (else today); duration defaults to 90 days.
    const rawDuration = (req.body as { durationDays?: unknown })?.durationDays;
    const durationDays =
      rawDuration === undefined || rawDuration === null
        ? DEFAULT_DISCOVERY_DAYS
        : Number(rawDuration);
    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      return res.status(400).json({ error: "durationDays must be a positive integer" });
    }

    const rawStart = (req.body as { startDate?: unknown })?.startDate;
    const startDate =
      typeof rawStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawStart)
        ? rawStart
        : onboardedAt
        ? new Date(onboardedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    // 3. Count existing kickoff-phase tasks. This is no longer a hard block —
    //    regenerate is first-class — but the count tells the UI that applying will replace them.
    const taskCountResult = await query(
      `SELECT COUNT(*)::int AS count FROM tasks WHERE client_id = $1 AND phase = 'kickoff'`,
      [clientId]
    );
    const existingKickoffCount = Number(taskCountResult.rows[0]?.count ?? 0);

    // 4. Gate on scope materials — at least one uploaded document is required.
    //    Also fetch indexed chunk count in the same query for personalization level.
    //    Gate uses document_count (matching what the frontend shows) so an uploaded-but-not-yet-indexed
    //    doc doesn't produce a confusing "no materials" rejection; personalization uses chunk_count
    //    (accurate signal of RAG-able content).
    const docGateResult = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM documents      WHERE client_id = $1) AS document_count,
         (SELECT COUNT(*)::int FROM document_chunks WHERE client_id = $1) AS chunk_count`,
      [clientId]
    );
    const documentCount = Number(docGateResult.rows[0]?.document_count ?? 0);
    const chunkCount    = Number(docGateResult.rows[0]?.chunk_count    ?? 0);

    if (documentCount === 0) {
      const response: NoScopeMaterialsResponse = {
        noScopeMaterials: true,
        message: `${clientName} has no documents in their Data Room. Upload at least one contract, scope document, or intake form before generating the kickoff plan.`,
      };
      return res.json(response);
    }

    // 5. Pull the Discover phase activities from the TFO methodology
    const discoverPhase = getPhaseForQuarter(1);
    if (!discoverPhase) {
      return res.status(500).json({ error: "Could not load TFO Discover phase methodology" });
    }

    const activitiesText = discoverPhase.activities
      .map(
        (a) =>
          `- [${a.id}] ${a.name}: ${a.description}${a.isRequired ? " [REQUIRED]" : " [optional]"}` +
          `\n  Success indicator: ${a.successIndicator}`
      )
      .join("\n");

    // 6. Retrieve relevant document chunks from the client's data room via RAG
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

    // chunkCount from the gate query is the accurate signal: the client has indexed content if > 0.
    // retrieveChunks() always merges global methodology chunks so its length is not a reliable indicator.
    const personalizationLevel: "full" | "methodology-only" =
      chunkCount > 0 ? "full" : "methodology-only";

    // 7. Call Claude to generate the kickoff task list
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
      `Each task should map to exactly one of the Discover phase activities above. ` +
      `Prioritize required activities. ` +
      `If client documents were provided above, use them to personalise task descriptions and rationale. ` +
      `\n\nReturn a JSON array where each element has exactly these fields:\n` +
      `{\n` +
      `  "title": "string — concise task title (max 80 chars)",\n` +
      `  "description": "string — 1–2 sentences explaining what needs to be done",\n` +
      `  "assignee": "advisor" or "client",\n` +
      `  "priority": "high", "medium", or "low",\n` +
      `  "activityId": "string — the bracketed id of the Discover activity this task maps to (e.g. 'discover-master-intake')",\n` +
      `  "phase": "string — the Discover phase activity name this task belongs to (e.g. 'Master Intake')",\n` +
      `  "rationale": "string — why this task matters for this engagement",\n` +
      `  "sourceContext": "string — a short excerpt (max ~200 chars) from client docs that informed this task, or empty string if none"\n` +
      `}`;

    // max_tokens must comfortably exceed the full JSON array. With document excerpts
    // the model quotes into sourceContext, so a 2000-token cap truncates the array
    // mid-string and breaks JSON.parse. 8000 gives ample headroom (typical output ~2k).
    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // 8. Parse Claude's JSON response.
    const rawText =
      aiResponse.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "[]";

    // If the model hit the token ceiling the JSON is truncated — fail with a clear reason.
    if (aiResponse.stop_reason === "max_tokens") {
      console.error("kickoff-plan: response truncated (stop_reason=max_tokens). Raw text tail:", rawText.slice(-200));
      return res.status(500).json({
        error: "The AI response was too long and got cut off. Please try again.",
      });
    }

    // Strip accidental code fences, then isolate the JSON array (first '[' .. last ']')
    // so any stray prose around it doesn't break parsing.
    let jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    const firstBracket = jsonText.indexOf("[");
    const lastBracket = jsonText.lastIndexOf("]");
    if (firstBracket > 0 || (lastBracket !== -1 && lastBracket < jsonText.length - 1)) {
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        jsonText = jsonText.slice(firstBracket, lastBracket + 1);
      }
    }

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
          title: (String(item.title ?? "").trim() || "Untitled Task").slice(0, 80),
          description: String(item.description ?? ""),
          assignee:
            item.assignee === "client" ? ("client" as const) : ("advisor" as const),
          priority:
            item.priority === "high"
              ? ("high" as const)
              : item.priority === "low"
              ? ("low" as const)
              : ("medium" as const),
          activityId: String(item.activityId ?? "").trim(),
          phase: String(item.phase ?? "Discover"),
          rationale: String(item.rationale ?? ""),
          sourceContext: String(item.sourceContext ?? ""),
          dueDate: null as string | null,
        }));
    } catch (parseErr) {
      console.error("kickoff-plan JSON parse error:", parseErr, "\nRaw text:", rawText);
      return res.status(500).json({ error: "Failed to parse AI-generated task list. Please try again." });
    }

    if (tasks.length === 0) {
      console.error("kickoff-plan: Claude returned zero valid tasks. Raw text:", rawText);
      return res.status(500).json({
        error: "The AI did not return any valid tasks. Please try again — if the problem persists, contact support.",
      });
    }

    // 9. Back-schedule due dates across the discovery window, respecting prerequisites.
    //    The server is the sole date authority — Claude only tags each task with an activityId.
    const dueDateByActivity = computeDueDates(discoverPhase.activities, startDate, durationDays);
    const windowEnd = addDaysUTC(startDate, durationDays);
    // Name -> id lookup (lowercased) for fallback when Claude omits/garbles activityId.
    const idByName = new Map(
      discoverPhase.activities.map((a) => [a.name.toLowerCase(), a.id])
    );

    for (const task of tasks) {
      let activityId = task.activityId;
      if (!dueDateByActivity[activityId]) {
        // Fallback: match the LLM's phase/name string against a known activity name.
        const guessed = idByName.get(task.phase.trim().toLowerCase());
        if (guessed) {
          activityId = guessed;
          task.activityId = guessed;
        } else {
          console.warn(
            `kickoff-plan: task "${task.title}" has unresolved activityId "${task.activityId}" / phase "${task.phase}" — defaulting due date to window end`
          );
        }
      }
      task.dueDate = dueDateByActivity[activityId] ?? windowEnd;
    }

    const responsePayload: KickoffPlanResponse = {
      tasks,
      clientName,
      phase: "Discover",
      personalizationLevel,
      startDate,
      durationDays,
      existingKickoffCount,
    };

    return res.json(responsePayload);
  } catch (err) {
    console.error("POST /api/clients/:id/kickoff-plan error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clients/:id/kickoff-plan/apply
// Persist a reviewed kickoff plan. When `replace` is true, existing kickoff-phase
// tasks are deleted first (regenerate). The whole operation is transactional, so a
// failure mid-way rolls back and leaves the existing tasks untouched.
router.post("/:id/kickoff-plan/apply", async (req, res) => {
  const { id: clientId } = req.params;
  const { tasks: rawTasks, replace } = (req.body ?? {}) as {
    tasks?: unknown;
    replace?: unknown;
  };

  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    return res.status(400).json({ error: "tasks must be a non-empty array" });
  }

  try {
    if (!(await verifyClientAccess(clientId, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Validate + normalise each incoming task into a flat insert shape.
    const toInsert = rawTasks
      .filter((t): t is Record<string, unknown> => t !== null && typeof t === "object")
      .map((t) => {
        const title = String(t.title ?? "").trim().slice(0, 200);
        const priority = VALID_PRIORITIES.has(String(t.priority))
          ? String(t.priority)
          : "medium";
        const assignee = t.assignee === "client" ? "client" : "advisor";
        const due = t.dueDate;
        const dueDate =
          typeof due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null;
        const notes = String(t.description ?? "").trim() || null;
        return { title, priority, assignee, dueDate, notes };
      })
      .filter((t) => t.title.length > 0);

    if (toInsert.length === 0) {
      return res.status(400).json({ error: "No valid tasks to apply (each needs a title)" });
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");

      if (replace === true) {
        await dbClient.query(
          `DELETE FROM tasks WHERE client_id = $1 AND phase = 'kickoff'`,
          [clientId]
        );
      }

      const created = [];
      for (const t of toInsert) {
        const result = await dbClient.query(
          `INSERT INTO tasks (client_id, title, status, priority, phase, due_date, notes, assignee)
           VALUES ($1, $2, 'todo', $3, 'kickoff', $4, $5, $6)
           RETURNING id, client_id, title, status, priority, phase, due_date, notes, assignee, created_at`,
          [clientId, t.title, t.priority, t.dueDate, t.notes, t.assignee]
        );
        created.push(result.rows[0]);
      }

      await dbClient.query("COMMIT");
      return res.status(201).json({ tasks: created, replaced: replace === true });
    } catch (txErr) {
      await dbClient.query("ROLLBACK");
      throw txErr;
    } finally {
      dbClient.release();
    }
  } catch (err) {
    console.error("POST /api/clients/:id/kickoff-plan/apply error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

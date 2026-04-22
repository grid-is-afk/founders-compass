import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import pool, { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiagnoseTask {
  id: string;
  client_id: string;
  title: string;
  status: string;
  priority: string;
  phase: string;
  created_at: string;
}

interface ClaudeActionItem {
  title: string;
  category: string;
  priority: "high" | "medium" | "low";
}

interface SnapshotDimension {
  signal?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function feiLevel(total: number): string {
  if (total >= 43) return "Low Exposure";
  if (total >= 27) return "Moderate Exposure";
  return "High Exposure";
}

function buildDiagnosePrompt(
  sixCsScores: Record<string, number> | null,
  sixCsTotalScore: number | null,
  eiScores: Record<string, number> | null,
  matrixEntityType: string | null,
  matrixResponses: Record<string, unknown> | null,
  snapshotResponses: Record<string, SnapshotDimension> | null
): string {
  // Six C's section
  let sixCsSection = "Not completed";
  if (sixCsScores && sixCsTotalScore !== null) {
    const scoreList = Object.entries(sixCsScores)
      .map(([k, v]) => `${k}: ${v}/3`)
      .join(", ");
    sixCsSection = `${sixCsTotalScore}/18 — [${scoreList}]`;
  }

  // Exposure Index section
  let eiSection = "Not completed";
  if (eiScores) {
    const total = Object.values(eiScores).reduce((acc, v) => acc + v, 0);
    const level = feiLevel(total);
    const catList = Object.entries(eiScores)
      .map(([cat, score]) => {
        const catLevel = score >= 7 ? "Low" : score >= 4 ? "Medium" : "High";
        return `${cat}: ${score}/9 (${catLevel})`;
      })
      .join(", ");
    eiSection = `${total}/54 · ${level} — [${catList}]`;
  }

  // Founder Matrix section
  let matrixSection = "Not completed";
  if (matrixEntityType) {
    const flags: string[] = [];
    if (matrixResponses && typeof matrixResponses === "object") {
      // Extract boolean-style flags from responses
      for (const [key, val] of Object.entries(matrixResponses)) {
        if (val === false || val === "no" || val === "No") {
          flags.push(key);
        }
      }
    }
    matrixSection =
      flags.length > 0
        ? `${matrixEntityType.toUpperCase()} — Structural gaps: ${flags.slice(0, 5).join(", ")}`
        : `${matrixEntityType.toUpperCase()} — No flags`;
  }

  // Founder Snapshot section
  let snapshotSection = "Not completed";
  if (snapshotResponses) {
    const dims = Object.entries(snapshotResponses);
    const dimList = dims
      .map(([name, val]) => `${name}: ${val?.signal ?? "unknown"}`)
      .join(", ");
    snapshotSection = `${dims.length}/5 dimensions — [${dimList}]`;
  }

  return `You are analyzing founder diagnostic assessments to generate a prioritized action plan.

Assessment Results:
- Six C's Baseline: ${sixCsSection}
- Founder Exposure Index: ${eiSection}
- Founder Matrix: ${matrixSection}
- Founder Snapshot: ${snapshotSection}

Generate 4-8 specific, prioritized action items for this founder. Each action item should address a real risk or gap revealed by the assessments.

Return ONLY a JSON array with this exact structure:
[
  { "title": "...", "category": "...", "priority": "high|medium|low" }
]
No other text.`;
}

// ---------------------------------------------------------------------------
// GET /:clientId/diagnose-action-items
// ---------------------------------------------------------------------------

router.get("/:clientId/diagnose-action-items", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id, title, status, priority, phase, created_at
       FROM tasks
       WHERE client_id = $1 AND phase = 'diagnose'
       ORDER BY created_at ASC`,
      [clientId]
    );

    return res.json(result.rows as DiagnoseTask[]);
  } catch (err) {
    console.error("GET /:clientId/diagnose-action-items error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /:clientId/diagnose-action-items
// Fetches all diagnostic data, calls Claude, replaces existing diagnose tasks.
// ---------------------------------------------------------------------------

router.post("/:clientId/diagnose-action-items", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    // Fetch the client record (need source_prospect_id for Six C's fallback)
    const clientResult = await query(
      "SELECT id, source_prospect_id FROM clients WHERE id = $1",
      [clientId]
    );
    const sourceProspectId = (
      clientResult.rows[0] as { source_prospect_id: string | null }
    ).source_prospect_id;

    // Run all assessment fetches in parallel
    const [eiResult, matrixResult, snapshotResult, clientSixCsResult] =
      await Promise.all([
        query(
          `SELECT category_scores, completed_at
           FROM client_exposure_index
           WHERE client_id = $1
           ORDER BY completed_at DESC
           LIMIT 1`,
          [clientId]
        ),
        query(
          `SELECT entity_type, responses, completed_at
           FROM client_founder_matrix
           WHERE client_id = $1
           ORDER BY completed_at DESC
           LIMIT 1`,
          [clientId]
        ),
        query(
          `SELECT responses, completed_at
           FROM client_founder_snapshot
           WHERE client_id = $1
           ORDER BY completed_at DESC
           LIMIT 1`,
          [clientId]
        ),
        query(
          `SELECT scores, total_score, completed_at
           FROM client_six_cs
           WHERE client_id = $1
           ORDER BY completed_at DESC
           LIMIT 1`,
          [clientId]
        ),
      ]);

    // Six C's: prefer client_six_cs, fall back to prospect_six_cs
    let sixCsScores: Record<string, number> | null = null;
    let sixCsTotalScore: number | null = null;

    if (clientSixCsResult.rows.length > 0) {
      sixCsScores = clientSixCsResult.rows[0].scores as Record<
        string,
        number
      > | null;
      sixCsTotalScore = clientSixCsResult.rows[0].total_score as number | null;
    } else if (sourceProspectId) {
      const prospectSixCsResult = await query(
        `SELECT scores, total_score
         FROM prospect_six_cs
         WHERE prospect_id = $1
         ORDER BY completed_at DESC
         LIMIT 1`,
        [sourceProspectId]
      );
      if (prospectSixCsResult.rows.length > 0) {
        sixCsScores = prospectSixCsResult.rows[0].scores as Record<
          string,
          number
        > | null;
        sixCsTotalScore = prospectSixCsResult.rows[0]
          .total_score as number | null;
      }
    }

    const eiScores =
      eiResult.rows.length > 0
        ? (eiResult.rows[0].category_scores as Record<string, number> | null)
        : null;

    const matrixEntityType =
      matrixResult.rows.length > 0
        ? (matrixResult.rows[0].entity_type as string | null)
        : null;

    const matrixResponses =
      matrixResult.rows.length > 0
        ? (matrixResult.rows[0].responses as Record<
            string,
            unknown
          > | null)
        : null;

    const snapshotResponses =
      snapshotResult.rows.length > 0
        ? (snapshotResult.rows[0].responses as Record<
            string,
            SnapshotDimension
          > | null)
        : null;

    // Build prompt and call Claude
    const prompt = buildDiagnosePrompt(
      sixCsScores,
      sixCsTotalScore,
      eiScores,
      matrixEntityType,
      matrixResponses,
      snapshotResponses
    );

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      claudeResponse.content[0]?.type === "text"
        ? claudeResponse.content[0].text
        : "";

    let actionItems: ClaudeActionItem[];
    try {
      const cleaned = rawText
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        throw new Error("Claude returned non-array response");
      }
      actionItems = parsed as ClaudeActionItem[];
    } catch {
      console.error("Claude returned invalid JSON:", rawText);
      return res
        .status(500)
        .json({ error: "AI returned invalid JSON. Please try again." });
    }

    // Validate priorities — default to 'medium' if Claude returns something unexpected
    const validPriorities = new Set(["high", "medium", "low"]);
    const sanitized = actionItems.map((item) => ({
      title: String(item.title ?? "").slice(0, 500),
      priority: validPriorities.has(item.priority) ? item.priority : "medium",
    }));

    // Transactionally delete existing diagnose tasks and insert new ones
    const dbClient = await pool.connect();
    let createdTasks: DiagnoseTask[] = [];

    try {
      await dbClient.query("BEGIN");

      await dbClient.query(
        "DELETE FROM tasks WHERE client_id = $1 AND phase = 'diagnose'",
        [clientId]
      );

      for (const item of sanitized) {
        const result = await dbClient.query(
          `INSERT INTO tasks (client_id, title, status, priority, phase)
           VALUES ($1, $2, 'todo', $3, 'diagnose')
           RETURNING id, client_id, title, status, priority, phase, created_at`,
          [clientId, item.title, item.priority]
        );
        createdTasks.push(result.rows[0] as DiagnoseTask);
      }

      await dbClient.query("COMMIT");
    } catch (txErr) {
      await dbClient.query("ROLLBACK");
      throw txErr;
    } finally {
      dbClient.release();
    }

    return res.status(201).json(createdTasks);
  } catch (err) {
    console.error("POST /:clientId/diagnose-action-items error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

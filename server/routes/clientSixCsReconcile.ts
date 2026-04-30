import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "../db.js";
import { requireClientOwnership } from "../lib/clientAuth.js";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReconcileFinding {
  c: string;
  self_score: number;
  status: "confirmed" | "gap" | "discrepancy";
  finding: string;
  suggested_score: number;
}

interface ClaudeReconcileResponse {
  findings: ReconcileFinding[];
  summary: string;
}

interface SixCsRow {
  scores: Record<string, number> | null;
  total_score: number | null;
}

interface DocumentRow {
  name: string;
  category: string | null;
  type: string | null;
}

// ---------------------------------------------------------------------------
// GET /:clientId/six-cs-reconcile
// ---------------------------------------------------------------------------

router.get("/:clientId/six-cs-reconcile", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    const result = await query(
      `SELECT id, client_id, advisor_id, findings, summary, generated_at
       FROM client_six_cs_reconcile
       WHERE client_id = $1
       ORDER BY generated_at DESC
       LIMIT 1`,
      [clientId]
    );

    return res.json(result.rows[0] ?? null);
  } catch (err) {
    console.error("GET /:clientId/six-cs-reconcile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /:clientId/six-cs-reconcile
// Fetches Six C's scores + documents, calls Claude, stores and returns result.
// ---------------------------------------------------------------------------

router.post("/:clientId/six-cs-reconcile", async (req, res) => {
  const { clientId } = req.params;
  const advisorId = req.user!.id;

  try {
    const owned = await requireClientOwnership(res, clientId, advisorId);
    if (!owned) return;

    // Fetch source_prospect_id for fallback Six C's lookup
    const clientResult = await query(
      "SELECT id, source_prospect_id FROM clients WHERE id = $1",
      [clientId]
    );
    const sourceProspectId = (
      clientResult.rows[0] as { source_prospect_id: string | null }
    ).source_prospect_id;

    // Fetch all data in parallel
    const [clientSixCsResult, docsResult] = await Promise.all([
      query(
        `SELECT scores, total_score
         FROM client_six_cs
         WHERE client_id = $1
         ORDER BY completed_at DESC
         LIMIT 1`,
        [clientId]
      ),
      query(
        `SELECT name, category, type
         FROM documents
         WHERE client_id = $1
         ORDER BY uploaded_at DESC
         LIMIT 30`,
        [clientId]
      ),
    ]);

    // Six C's: prefer client_six_cs, fall back to prospect_six_cs
    let sixCsScores: Record<string, number> | null = null;
    let sixCsTotalScore: number | null = null;

    if (clientSixCsResult.rows.length > 0) {
      const row = clientSixCsResult.rows[0] as SixCsRow;
      sixCsScores = row.scores;
      sixCsTotalScore = row.total_score;
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
        const row = prospectSixCsResult.rows[0] as SixCsRow;
        sixCsScores = row.scores;
        sixCsTotalScore = row.total_score;
      }
    }

    // Build Six C's section of the prompt
    let sixCsSection = "Not completed";
    if (sixCsScores && sixCsTotalScore !== null) {
      const scoreList = Object.entries(sixCsScores)
        .map(([k, v]) => `${k}: ${v}/3`)
        .join(", ");
      sixCsSection = `Total: ${sixCsTotalScore}/18\n${scoreList}`;
    }

    // Build documents section of the prompt
    const docs = docsResult.rows as DocumentRow[];
    const docsSection =
      docs.length > 0
        ? docs
            .map((d) => `- ${d.name}${d.category ? ` (${d.category})` : ""}`)
            .join("\n")
        : "No documents uploaded.";

    const prompt = `You are reconciling a founder's self-assessed Six C's scores against their data room documents.

Six C's Self-Assessment:
${sixCsSection}

Data Room Documents:
${docsSection}

For each of the Six C's, determine:
- "confirmed": the data room evidence supports the self-assessed score
- "gap": there is missing documentation that should be present given the score
- "discrepancy": the available evidence contradicts the self-assessed score

Also suggest a revised score (1-3) if appropriate.

Return ONLY a JSON object with this exact structure:
{
  "findings": [
    {
      "c": "Capital",
      "self_score": 2,
      "status": "confirmed|gap|discrepancy",
      "finding": "One sentence explanation",
      "suggested_score": 2
    }
  ],
  "summary": "2-3 sentence overall reconciliation summary"
}
No other text.`;

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      claudeResponse.content[0]?.type === "text"
        ? claudeResponse.content[0].text
        : "";

    let parsed: ClaudeReconcileResponse;
    try {
      const cleaned = rawText
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
      parsed = JSON.parse(cleaned) as ClaudeReconcileResponse;
      if (!Array.isArray(parsed.findings)) {
        throw new Error("Claude returned invalid findings array");
      }
    } catch {
      console.error("Claude returned invalid JSON:", rawText);
      return res
        .status(500)
        .json({ error: "AI returned invalid JSON. Please try again." });
    }

    // Replace any existing reconciliation for this client+advisor and insert the new one
    await query(
      "DELETE FROM client_six_cs_reconcile WHERE client_id = $1 AND advisor_id = $2",
      [clientId, advisorId]
    );

    const insertResult = await query(
      `INSERT INTO client_six_cs_reconcile (client_id, advisor_id, findings, summary)
       VALUES ($1, $2, $3, $4)
       RETURNING id, client_id, advisor_id, findings, summary, generated_at`,
      [clientId, advisorId, JSON.stringify(parsed.findings), parsed.summary]
    );

    return res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error("POST /:clientId/six-cs-reconcile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

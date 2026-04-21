import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import pool, { query } from "../db.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../uploads");

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BATCH_SIZE = 10;
const MAX_PDF_BYTES = 10 * 1024 * 1024; // skip PDFs over 10 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DocRow = { id: string; name: string; file_url: string | null; type: string };

interface ReadableDoc {
  name: string;
  filePath: string;
  type: string;
}

function collectReadableDocs(docs: DocRow[]): ReadableDoc[] {
  const result: ReadableDoc[] = [];
  for (const doc of docs) {
    if (!doc.file_url) continue;
    const filePath = path.join(UPLOADS_DIR, path.basename(doc.file_url));
    if (!fs.existsSync(filePath)) continue;
    if (doc.type === "pdf") {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_PDF_BYTES) continue;
    }
    result.push({ name: doc.name, filePath, type: doc.type });
  }
  return result;
}

function buildContentBlocks(docs: ReadableDoc[]): Anthropic.Messages.MessageParam["content"] {
  const blocks: Anthropic.Messages.MessageParam["content"] = [];
  for (const doc of docs) {
    if (doc.type === "pdf") {
      const buffer = fs.readFileSync(doc.filePath);
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
        title: doc.name,
      } as Anthropic.Messages.DocumentBlockParam);
    } else {
      try {
        const raw = fs.readFileSync(doc.filePath).toString("utf-8").slice(0, 8000);
        if (raw.trim()) {
          blocks.push({ type: "text", text: `=== ${doc.name} ===\n${raw.trim()}` });
        }
      } catch {
        // skip unreadable files
      }
    }
  }
  return blocks;
}

// Pass 1: extract findings from one batch using fast/cheap Haiku
async function analyzeBatch(
  docs: ReadableDoc[],
  clientName: string,
  batchNum: number,
  totalBatches: number
): Promise<string> {
  const blocks = buildContentBlocks(docs);
  if (blocks.length === 0) return "";

  blocks.push({
    type: "text",
    text: `Batch ${batchNum} of ${totalBatches} — documents from ${clientName}'s data room.

Extract key findings relevant to:
- Business clarity and strategic focus
- Capital structure, debt, equity, or ownership details
- Governance, compliance, legal agreements
- Team composition, succession, legacy indicators
- Revenue, EBITDA, multiples, growth rate
- ESOP structures or employee equity
- Acquisition discussions, LOIs, or strategic partnerships
- Recapitalization or minority investment signals
- Investor alignment or misalignment

If the documents contain no relevant financial or business information, respond with exactly: NO_FINANCIAL_DATA
Otherwise return a concise plain-text summary of findings only. No JSON. No headers. Focus on facts found in these documents.`,
  });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system:
      "You are a financial document analyst for a founder advisory platform. Extract key business, financial, and legal insights from the documents provided. If documents contain no relevant financial or business information, say so briefly.",
    messages: [{ role: "user", content: blocks }],
  }, { timeout: 90_000 });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

// Pass 2: synthesize all batch findings into final structured JSON
async function synthesize(
  allFindings: string[],
  clientName: string,
  docCount: number
): Promise<string> {
  const findingsText = allFindings
    .map((f, i) => `=== Batch ${i + 1} Findings ===\n${f}`)
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system:
      "You are the Quarterback Copilot for The Founders Office. Synthesize document findings into structured dashboard scores. Be conservative — only score what the findings support. Use null for anything that cannot be determined.",
    messages: [
      {
        role: "user",
        content: `You have just analyzed all ${docCount} documents from ${clientName}'s data room across ${allFindings.length} batches. Here are the findings from each batch:

${findingsText}

Now synthesize everything into a single JSON object. Return ONLY valid JSON — no markdown, no explanation.

All scores: 0–100 integers. Percentages: 0–100 integers. Multiples: numeric (e.g. 3.0). Capital optionality labels must be "Explore", "Viable", or "Recommended". Use null for any field you cannot determine.

{
  "six_keys": {
    "clarity": <0-100 or null>,
    "alignment": <0-100 or null>,
    "structure": <0-100 or null>,
    "stewardship": <0-100 or null>,
    "velocity": <0-100 or null>,
    "legacy": <0-100 or null>,
    "notes": "<brief explanation>"
  },
  "ipd": {
    "persuasiveness_of_problem": <0-100 or null>,
    "confidence_in_solution": <0-100 or null>,
    "combined_index": <0-100 or null>,
    "probability_label": "<Low/Medium/High/Very High or null>",
    "problem_axes": [{"axis": "<name>", "value": <0-100>}],
    "solution_axes": [{"axis": "<name>", "value": <0-100>}]
  },
  "capital_optionality": {
    "minority_recap_pct": <0-100 or null>,
    "minority_recap_label": "<Explore/Viable/Recommended or null>",
    "strategic_acq_pct": <0-100 or null>,
    "strategic_acq_label": "<Explore/Viable/Recommended or null>",
    "esop_pct": <0-100 or null>,
    "esop_label": "<Explore/Viable/Recommended or null>",
    "full_exit_pct": <0-100 or null>,
    "full_exit_label": "<Explore/Viable/Recommended or null>",
    "notes": "<brief explanation>"
  },
  "multiples": {
    "initial_multiple": <numeric or null>,
    "current_multiple": <numeric or null>,
    "best_in_class": <numeric or null>,
    "goal_multiple": <numeric or null>
  }
}`,
      },
    ],
  }, { timeout: 90_000 });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ---------------------------------------------------------------------------
// POST /api/clients/:clientId/analyze-data-room  (SSE streaming)
// ---------------------------------------------------------------------------

router.post("/:clientId/analyze-data-room", async (req, res) => {
  // SSE headers — keep connection open so we can stream progress events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: Record<string, unknown>) =>
    res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const advisorId = req.user!.id;
    const { clientId } = req.params;

    const clientCheck = await query(
      "SELECT name FROM clients WHERE id = $1 AND advisor_id = $2",
      [clientId, advisorId]
    );
    if (clientCheck.rows.length === 0) {
      send({ type: "error", message: "Access denied" });
      return res.end();
    }
    const clientName = clientCheck.rows[0].name as string;

    const docsResult = await query(
      "SELECT id, name, file_url, type FROM documents WHERE client_id = $1 ORDER BY uploaded_at ASC",
      [clientId]
    );

    if (docsResult.rows.length === 0) {
      send({ type: "error", message: "No documents found in Data Room" });
      return res.end();
    }

    const allDocs = docsResult.rows as DocRow[];
    const readable = collectReadableDocs(allDocs);

    if (readable.length === 0) {
      send({ type: "error", message: "No readable documents found. Make sure PDF files are uploaded to the Data Room." });
      return res.end();
    }

    send({ type: "start", total: readable.length });

    // Split into batches
    const batches: ReadableDoc[][] = [];
    for (let i = 0; i < readable.length; i += BATCH_SIZE) {
      batches.push(readable.slice(i, i + BATCH_SIZE));
    }

    // Pass 1: analyze each batch, emitting a progress event per file
    const batchFindings: string[] = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Announce each file in this batch before sending to Claude
      for (let j = 0; j < batch.length; j++) {
        const globalIndex = i * BATCH_SIZE + j + 1;
        send({ type: "file", name: batch[j].name, current: globalIndex, total: readable.length });
      }

      send({ type: "analyzing", batch: i + 1, totalBatches: batches.length });
      const findings = await analyzeBatch(batch, clientName, i + 1, batches.length);
      if (findings.trim() && findings.trim() !== "NO_FINANCIAL_DATA") {
        batchFindings.push(findings);
      }
    }

    if (batchFindings.length === 0) {
      send({ type: "error", message: "QB could not extract financial or business data from these documents. For best results, upload financial statements, contracts, legal agreements, or business reports." });
      return res.end();
    }

    // Pass 2: synthesize
    send({ type: "synthesizing", total: readable.length });
    const rawText = await synthesize(batchFindings, clientName, readable.length);

    let parsed: {
      six_keys?: Record<string, unknown>;
      ipd?: Record<string, unknown>;
      capital_optionality?: Record<string, unknown>;
      multiples?: Record<string, unknown>;
    };
    try {
      const cleaned = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      send({ type: "error", message: "AI returned invalid JSON. Please try again." });
      return res.end();
    }

    // ---------------------------------------------------------------------------
    // Persist results
    // ---------------------------------------------------------------------------

    const dbClient = await pool.connect();
    const updated: string[] = [];

    try {
      await dbClient.query("BEGIN");

      const sk = parsed.six_keys;
      if (sk && Object.values(sk).some((v) => v !== null && typeof v === "number")) {
        await dbClient.query("DELETE FROM client_six_keys WHERE client_id = $1", [clientId]);
        await dbClient.query(
          `INSERT INTO client_six_keys
             (client_id, clarity, alignment, structure, stewardship, velocity, legacy, notes, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [clientId, sk.clarity ?? null, sk.alignment ?? null, sk.structure ?? null,
           sk.stewardship ?? null, sk.velocity ?? null, sk.legacy ?? null, (sk.notes as string) || null]
        );
        updated.push("Six Keys of Capital");
      }

      const ipd = parsed.ipd;
      if (ipd && (ipd.persuasiveness_of_problem !== null || ipd.confidence_in_solution !== null)) {
        await dbClient.query(
          `INSERT INTO client_ipd_metrics
             (client_id, persuasiveness_of_problem, confidence_in_solution,
              combined_index, probability_label, problem_axes, solution_axes,
              generated_from_data_room, last_generated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())`,
          [clientId, ipd.persuasiveness_of_problem ?? null, ipd.confidence_in_solution ?? null,
           ipd.combined_index ?? null, ipd.probability_label ?? null,
           JSON.stringify(ipd.problem_axes ?? []), JSON.stringify(ipd.solution_axes ?? [])]
        );
        updated.push("Investment Probability Dashboard");
      }

      const co = parsed.capital_optionality;
      if (co && Object.values(co).some((v) => v !== null && typeof v === "number")) {
        await dbClient.query("DELETE FROM client_capital_optionality WHERE client_id = $1", [clientId]);
        await dbClient.query(
          `INSERT INTO client_capital_optionality
             (client_id, minority_recap_pct, minority_recap_label,
              strategic_acq_pct, strategic_acq_label,
              esop_pct, esop_label, full_exit_pct, full_exit_label, notes, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [clientId,
           co.minority_recap_pct ?? null, co.minority_recap_label ?? null,
           co.strategic_acq_pct ?? null, co.strategic_acq_label ?? null,
           co.esop_pct ?? null, co.esop_label ?? null,
           co.full_exit_pct ?? null, co.full_exit_label ?? null,
           (co.notes as string) || null]
        );
        updated.push("Capital Optionality");
      }

      const mult = parsed.multiples;
      if (mult && Object.values(mult).some((v) => v !== null)) {
        await dbClient.query("DELETE FROM client_multiples WHERE client_id = $1", [clientId]);
        await dbClient.query(
          `INSERT INTO client_multiples
             (client_id, initial_multiple, current_multiple, best_in_class, goal_multiple, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [clientId, mult.initial_multiple ?? null, mult.current_multiple ?? null,
           mult.best_in_class ?? null, mult.goal_multiple ?? null]
        );
        updated.push("Assessment Pulse (Multiples)");
      }

      await dbClient.query("COMMIT");
    } catch (dbErr) {
      await dbClient.query("ROLLBACK");
      throw dbErr;
    } finally {
      dbClient.release();
    }

    if (updated.length === 0) {
      send({ type: "error", message: "QB could not extract financial or business data from these documents. For best results, upload financial statements, contracts, legal agreements, or business reports." });
      return res.end();
    }

    send({ type: "done", updated, documentsAnalyzed: readable.length, totalDocuments: allDocs.length });
    return res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error analyzing data room:", message);
    send({ type: "error", message });
    return res.end();
  }
});

export default router;

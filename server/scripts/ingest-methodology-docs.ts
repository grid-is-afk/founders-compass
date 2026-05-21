/**
 * Ingest TFO methodology reference documents into the methodology_chunks table.
 *
 * Reads local files from the Reference/ directory, extracts text, chunks it,
 * embeds with Voyage AI, and inserts into methodology_chunks (global — no client_id).
 *
 * Run with:
 *   npx tsx server/scripts/ingest-methodology-docs.ts
 *
 * Force re-ingestion even if table already has content:
 *   npx tsx server/scripts/ingest-methodology-docs.ts --force
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

import { query } from "../db.js";
import pool from "../db.js";
import { embedTexts } from "../lib/voyageai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Project root is two levels up from server/scripts/
const PROJECT_ROOT = path.resolve(__dirname, "../../");

const EMBED_BATCH_SIZE = 64;
const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

// ── File list ────────────────────────────────────────────────────────────────

const METHODOLOGY_FILES: Array<{ filePath: string; documentName: string }> = [
  {
    filePath: "Reference/TFO Operating System Tools/The Capital Alignment Method™.docx",
    documentName: "The Capital Alignment Method™",
  },
  {
    filePath: "Reference/TFO Operating System Tools/The Six Keys of Capital™.docx",
    documentName: "The Six Keys of Capital™",
  },
  {
    filePath: "Reference/TFO Operating System Tools/The Value Multiplier Framework™.docx",
    documentName: "The Value Multiplier Framework™",
  },
  {
    filePath: "Reference/TFO Operating System Tools/The Founders Optionality Framework™.docx",
    documentName: "The Founders Optionality Framework™",
  },
  {
    filePath: "Reference/TFO Operating System Tools/Capital Strategy Architecture™.docx",
    documentName: "Capital Strategy Architecture™",
  },
  {
    filePath: "Reference/TFO Operating System Tools/The Six Cs Famework™️ v2.docx",
    documentName: "The Six Cs Framework™",
  },
  {
    filePath: "Reference/TFO Operating System Tools/The Founder Exposure Index™.docx",
    documentName: "The Founder Exposure Index™",
  },
  {
    filePath: "Reference/TFO Operating System Tools/THE FOUNDER EXPOSURE INDEX DEFINITIONS.docx",
    documentName: "Founder Exposure Index — Definitions",
  },
  {
    filePath: "Reference/TFO Operating System Tools/The Founder Matrix™.docx",
    documentName: "The Founder Matrix™",
  },
  {
    filePath: "Reference/TFO Operating System Tools/The Founder Snapshot.docx",
    documentName: "The Founder Snapshot",
  },
  {
    filePath: "Reference/TFO Operating System Tools/TFO  Intake_Core_3Q_Per_Category.docx",
    documentName: "TFO Master Intake — Core Questions",
  },
  {
    filePath:
      "Reference/TFO Operating System Tools/Recasted Financials, Wealth Gap, Value Gap Reports.docx",
    documentName: "Recasted Financials, Wealth Gap & Value Gap Reports",
  },
  {
    filePath:
      "Reference/TFO Operating System Tools/Discovery Data Intake/Discovery_Data_Workshop_and_Clarity_Assessment_Fillable (1).docx",
    documentName: "Discovery Data Workshop & Clarity Assessment",
  },
  {
    filePath:
      "Reference/TFO Operating System Tools/Discovery Data Intake/Frequently requested document.docx",
    documentName: "Discovery — Frequently Requested Documents",
  },
  {
    filePath:
      "Reference/TFO Operating System Tools/Katie Demo/GMT20260402-190206_Recording.transcript.vtt",
    documentName: "Katie Demo — Session Transcript",
  },
  {
    filePath: "Reference/TFO - Tool Matrix from SmartSheet.pdf",
    documentName: "TFO Tool Matrix",
  },
  {
    filePath: "Reference/TFO - Tools Outline from SmartSheet.pdf",
    documentName: "TFO Tools Outline",
  },
  {
    filePath: "Reference/TFO Client Journey from MIRO.pdf",
    documentName: "TFO Client Journey",
  },
  {
    filePath: "Reference/THE FOUNDERS OFFICE MASTER INTAKE.docx",
    documentName: "The Founders Office Master Intake",
  },
  {
    filePath: "Reference/Client Schema - Founder's Compass (Tom Powell).docx",
    documentName: "Client Schema — Founder's Compass",
  },
  {
    filePath: "Reference/TFO - Review notes 05.12.26.pdf",
    documentName: "TFO Review Notes 05.12.26",
  },
];

// ── Text extraction ───────────────────────────────────────────────────────────

// We use dynamic require for pdf-parse (CJS-only) to match how ingestion.ts handles it.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

import mammoth from "mammoth";

function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (ext === ".vtt") return "vtt";
  return "txt";
}

/**
 * Strip VTT timing markers and extract only the spoken text lines.
 * VTT format: WEBVTT header, then timestamp lines like "00:00:01.000 --> 00:00:03.000",
 * followed by the spoken text. We skip headers, timestamps, and NOTE blocks.
 */
function extractVttText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const spoken: string[] = [];
  let skipNext = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip WEBVTT header and empty lines
    if (trimmed === "" || trimmed === "WEBVTT" || trimmed.startsWith("NOTE")) {
      skipNext = false;
      continue;
    }

    // Skip timestamp lines like "00:00:01.000 --> 00:00:03.000" or "1" (cue IDs)
    if (/^\d{2}:\d{2}:\d{2}/.test(trimmed) || /-->/.test(trimmed)) {
      continue;
    }

    // Skip pure numeric cue identifiers
    if (/^\d+$/.test(trimmed)) {
      continue;
    }

    // Strip speaker tags like "<v Speaker Name>" that VTT sometimes includes
    const cleaned = trimmed.replace(/<v[^>]*>/g, "").replace(/<\/v>/g, "").trim();
    if (cleaned) {
      spoken.push(cleaned);
    }
  }

  return spoken.join(" ");
}

async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType === "pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (fileType === "vtt") {
    return extractVttText(buffer.toString("utf-8"));
  }
  return buffer.toString("utf-8");
}

// ── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 1 <= CHUNK_SIZE) {
      current = current ? current + "\n\n" + para : para;
    } else {
      if (current) chunks.push(current);
      if (para.length > CHUNK_SIZE) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
        let buf = "";
        for (const s of sentences) {
          if (buf.length + s.length <= CHUNK_SIZE) {
            buf = buf ? buf + " " + s : s;
          } else {
            if (buf) chunks.push(buf);
            buf = s;
          }
        }
        current = buf;
      } else {
        current = para;
      }
    }
  }
  if (current) chunks.push(current);

  // Apply overlap: prepend tail of previous chunk to each chunk
  const overlapped: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      overlapped.push(chunks[i]);
    } else {
      const prev = chunks[i - 1];
      const tail = prev.slice(-CHUNK_OVERLAP);
      overlapped.push(tail + " " + chunks[i]);
    }
  }

  return overlapped;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const forceRerun = process.argv.includes("--force");

  // Check if already ingested
  if (!forceRerun) {
    const countResult = await query(
      "SELECT COUNT(*) AS cnt FROM methodology_chunks"
    );
    const existing = parseInt(
      (countResult.rows[0] as { cnt: string }).cnt,
      10
    );
    if (existing > 0) {
      console.log(
        `\nMethodology chunks already ingested (${existing} chunks found).`
      );
      console.log("Run with --force to re-ingest.\n");
      return;
    }
  } else {
    console.log("\n--force flag set — clearing existing methodology chunks...");
    await query("DELETE FROM methodology_chunks");
    console.log("Cleared.\n");
  }

  let totalChunks = 0;
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < METHODOLOGY_FILES.length; i++) {
    const { filePath, documentName } = METHODOLOGY_FILES[i];
    const absPath = path.join(PROJECT_ROOT, filePath);
    const fileName = path.basename(filePath);
    const prefix = `[${i + 1}/${METHODOLOGY_FILES.length}]`;

    // Skip if file doesn't exist
    if (!fs.existsSync(absPath)) {
      console.log(`${prefix} SKIP  ${fileName} — file not found at ${absPath}`);
      skippedCount++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(absPath);
      const fileType = getFileType(filePath);

      const rawText = await extractText(buffer, fileType);
      if (!rawText.trim()) {
        console.log(`${prefix} SKIP  ${fileName} — no extractable text`);
        skippedCount++;
        continue;
      }

      const chunks = chunkText(rawText);
      if (chunks.length === 0) {
        console.log(`${prefix} SKIP  ${fileName} — 0 chunks after processing`);
        skippedCount++;
        continue;
      }

      // Embed in batches
      const allEmbeddings: number[][] = [];
      for (let b = 0; b < chunks.length; b += EMBED_BATCH_SIZE) {
        const batch = chunks.slice(b, b + EMBED_BATCH_SIZE);
        const embeddings = await embedTexts(batch);
        allEmbeddings.push(...embeddings);
      }

      // Insert into methodology_chunks
      for (let c = 0; c < chunks.length; c++) {
        const vectorLiteral = `[${allEmbeddings[c].join(",")}]`;
        await query(
          `INSERT INTO methodology_chunks
             (document_name, file_name, chunk_index, chunk_text, embedding, metadata)
           VALUES ($1, $2, $3, $4, $5::vector, $6)`,
          [
            documentName,
            fileName,
            c,
            chunks[c],
            vectorLiteral,
            JSON.stringify({ document_name: documentName, file_name: fileName, source: "methodology" }),
          ]
        );
      }

      console.log(`${prefix} OK    ${fileName} → ${chunks.length} chunks`);
      totalChunks += chunks.length;
      successCount++;
    } catch (err) {
      console.error(
        `${prefix} ERROR ${fileName} — ${(err as Error).message}`
      );
      failedCount++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Methodology ingestion complete
  OK      : ${successCount} files
  Skipped : ${skippedCount} files (not found or empty)
  Errors  : ${failedCount} files
  Chunks  : ${totalChunks} total inserted
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(console.error).finally(() => pool.end());

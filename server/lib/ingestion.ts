import path from "path";
import { createRequire } from "module";
import mammoth from "mammoth";
import { supabase, STORAGE_BUCKET } from "./supabase.js";

const require = createRequire(import.meta.url);
// pdf-parse is CJS-only — must use createRequire in ESM context
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
import { embedTexts } from "./voyageai.js";
import { query } from "../db.js";

const CHUNK_SIZE = 1800;  // characters (~450 tokens)
const CHUNK_OVERLAP = 200; // characters (~50 tokens)
const EMBED_BATCH_SIZE = 128;

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
      // Para too long on its own — split by sentences
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
        if (buf) current = buf;
        else current = "";
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

async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType === "pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // Plain text files (.txt, .csv, .md)
  return buffer.toString("utf-8");
}

export async function ingestDocument(
  documentId: string,
  clientId: string
): Promise<void> {
  // Fetch document metadata
  const docResult = await query(
    "SELECT name, file_url, type FROM documents WHERE id = $1 AND client_id = $2",
    [documentId, clientId]
  );
  if (docResult.rows.length === 0) return;

  const { name: docName, file_url: fileUrl, type: fileType } = docResult.rows[0] as {
    name: string;
    file_url: string | null;
    type: string;
  };

  if (!fileUrl || fileUrl.startsWith("/uploads/")) return; // skip legacy local files

  // Determine processability from the actual file extension in the storage path
  const ext = path.extname(fileUrl).toLowerCase();
  const isPdf = ext === ".pdf";
  const isDocx = ext === ".docx";
  const isPlainText = [".txt", ".csv", ".md"].includes(ext);
  if (!isPdf && !isDocx && !isPlainText) return; // skip images, xlsx, pptx, etc.

  // Download from Supabase storage
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(fileUrl);
  if (error || !data) {
    console.error(`Ingestion: failed to download ${docName}:`, error);
    return;
  }

  const buffer = Buffer.from(await data.arrayBuffer());

  let text: string;
  try {
    const fileType = isPdf ? "pdf" : isDocx ? "docx" : "txt";
    text = await extractText(buffer, fileType);
  } catch (err) {
    console.error(`Ingestion: failed to extract text from ${docName}:`, err);
    return;
  }

  if (!text.trim()) {
    // No extractable text — image/scanned PDF. Mark it so the chat
    // endpoint can pass it directly to Claude for vision-based reading.
    await query("UPDATE documents SET is_image_pdf = true WHERE id = $1", [documentId]);
    console.log(`Ingestion: ${docName} → marked as image PDF (no extractable text)`);
    return;
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  // Delete existing chunks for this document (idempotent re-ingestion)
  await query("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);

  // Embed in batches
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedTexts(batch);
    allEmbeddings.push(...embeddings);
  }

  // Bulk insert
  for (let i = 0; i < chunks.length; i++) {
    const embedding = allEmbeddings[i];
    const vectorLiteral = `[${embedding.join(",")}]`;
    await query(
      `INSERT INTO document_chunks
         (document_id, client_id, chunk_index, chunk_text, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5::vector, $6)`,
      [
        documentId,
        clientId,
        i,
        chunks[i],
        vectorLiteral,
        JSON.stringify({ document_name: docName, file_type: fileType }),
      ]
    );
  }

  console.log(
    `Ingestion: ${docName} → ${chunks.length} chunks stored (client ${clientId})`
  );
}

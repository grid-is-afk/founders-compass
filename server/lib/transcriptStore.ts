import crypto from "crypto";
import { query } from "../db.js";
import { supabase, STORAGE_BUCKET } from "./supabase.js";
import { ingestDocument } from "./ingestion.js";

// Transcripts file into the same Data Room location as manually-uploaded ones, so
// they're selectable in the meeting CapturePanel "choose from Data Room" picker.
const TRANSCRIPT_CATEGORY = "Meeting Notes";
const TRANSCRIPT_SUBFOLDER = "Meeting Transcripts";

interface SaveTranscriptArgs {
  clientId?: string | null;
  prospectId?: string | null;
  title: string;
  text: string;
  occurredAt?: Date | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildName(title: string, occurredAt?: Date | null): string {
  const safeTitle = (title || "Untitled").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 120);
  const d = occurredAt ?? new Date();
  const dateStr = Number.isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 10)
    : d.toISOString().slice(0, 10);
  return `Otter — ${safeTitle} — ${dateStr}.txt`;
}

/**
 * Persist an Otter transcript (raw text) into a client's OR prospect's Data Room:
 * uploads the text to Supabase storage as a .txt, inserts a `documents` row, and
 * (for clients only) fires RAG ingestion. Prospect docs are ingested on conversion
 * to a client, mirroring the existing upload behavior. Returns the new document id.
 */
export async function saveTranscriptToDataRoom(
  args: SaveTranscriptArgs
): Promise<string> {
  const { clientId, prospectId, title, text } = args;
  if (!clientId && !prospectId) {
    throw new Error("saveTranscriptToDataRoom requires clientId or prospectId");
  }

  const ownerPath = clientId ? `clients/${clientId}` : `prospects/${prospectId}`;
  const bucketPath = `${ownerPath}/${crypto.randomUUID()}.txt`;
  const buffer = Buffer.from(text, "utf-8");

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(bucketPath, buffer, { contentType: "text/plain" });
  if (uploadError) throw uploadError;

  const displayName = buildName(title, args.occurredAt);
  const sizeLabel = formatBytes(buffer.length);

  const docResult = await query(
    `INSERT INTO documents
       (client_id, prospect_id, name, category, subfolder, file_url, size, size_bytes, type, uploaded_by_role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'document', 'advisor')
     RETURNING id`,
    [
      clientId ?? null,
      prospectId ?? null,
      displayName,
      TRANSCRIPT_CATEGORY,
      TRANSCRIPT_SUBFOLDER,
      bucketPath,
      sizeLabel,
      buffer.length,
    ]
  );
  const documentId = docResult.rows[0].id as string;

  // RAG ingestion is client-scoped; prospect docs get ingested on conversion.
  if (clientId) {
    ingestDocument(documentId, clientId).catch((err) =>
      console.error("QB ingestion failed for Otter transcript", documentId, err)
    );
  }

  return documentId;
}

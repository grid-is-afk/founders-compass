import { randomUUID } from "crypto";
import { supabase, STORAGE_BUCKET } from "./supabase.js";
import { query } from "../db.js";

export interface SaveReportOptions {
  clientId: string;
  baseTitle: string;
  contentBuffer: Buffer;
  mimeType: string;
  extension: string;
  /** When provided, enables UPSERT behaviour — one Data Room row per deliverable. */
  deliverableId?: string;
  /** Controls the "(Pending Review)" filename suffix. */
  reviewStatus?: "pending_review" | "approved" | null;
  category?: string;
}

export interface SaveReportResult {
  saved: boolean;
  wasUpdate: boolean;
  name: string;
  error?: string;
}

/**
 * Save (or overwrite) a deliverable document in Supabase Storage and the
 * `documents` table.
 *
 * When `deliverableId` is supplied:
 *   - If a `documents` row already exists for that deliverable, the existing
 *     storage path is reused and the file is overwritten via `upsert: true`.
 *   - If no row exists, a new row is inserted with `deliverable_id` set.
 *
 * When `deliverableId` is NOT supplied (legacy callers), the function falls
 * back to the original "always insert" behaviour so no existing callers break.
 */
export async function saveReportToDataRoom(
  options: SaveReportOptions
): Promise<SaveReportResult> {
  const {
    clientId,
    baseTitle,
    contentBuffer,
    mimeType,
    extension,
    deliverableId,
    reviewStatus,
    category = "Reports",
  } = options;

  const suffix =
    reviewStatus === "pending_review" ? " (Pending Review)" : "";
  const fileName = `${baseTitle}${suffix}.${extension}`;

  const sizeLabel =
    contentBuffer.byteLength < 1024
      ? `${contentBuffer.byteLength} B`
      : `${(contentBuffer.byteLength / 1024).toFixed(0)} KB`;

  // ------------------------------------------------------------------
  // UPSERT path — deliverableId provided
  // ------------------------------------------------------------------
  if (deliverableId) {
    // Check for an existing document row for this deliverable
    const existingResult = await query(
      "SELECT id, file_url FROM documents WHERE deliverable_id = $1 LIMIT 1",
      [deliverableId]
    );

    if (existingResult.rows.length > 0) {
      // Reuse the existing storage path — overwrite the file in place
      const existingRow = existingResult.rows[0] as {
        id: string;
        file_url: string;
      };

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(existingRow.file_url, contentBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Report overwrite in Supabase failed:", uploadError.message);
        return { saved: false, wasUpdate: true, name: fileName, error: uploadError.message };
      }

      await query(
        `UPDATE documents
         SET name = $1, size = $2, size_bytes = $3, type = 'document',
             updated_at = NOW()
         WHERE id = $4`,
        [fileName, sizeLabel, contentBuffer.byteLength, existingRow.id]
      );

      return { saved: true, wasUpdate: true, name: fileName };
    }

    // No existing row — fresh insert with deliverable_id
    const storagePath = `clients/${clientId}/reports/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, contentBuffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error("Report upload to Supabase failed:", uploadError.message);
      return { saved: false, wasUpdate: false, name: fileName, error: uploadError.message };
    }

    await query(
      `INSERT INTO documents
         (client_id, name, category, file_url, size, size_bytes, type, uploaded_by_role, deliverable_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'document', 'advisor', $7)`,
      [
        clientId,
        fileName,
        category,
        storagePath,
        sizeLabel,
        contentBuffer.byteLength,
        deliverableId,
      ]
    );

    return { saved: true, wasUpdate: false, name: fileName };
  }

  // ------------------------------------------------------------------
  // Legacy path — no deliverableId, always insert (backwards compat)
  // ------------------------------------------------------------------
  const { randomUUID } = await import("crypto");
  const storagePath = `clients/${clientId}/reports/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, contentBuffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    console.error("Report upload to Supabase failed:", uploadError.message);
    return { saved: false, wasUpdate: false, name: fileName, error: uploadError.message };
  }

  await query(
    `INSERT INTO documents (client_id, name, category, file_url, size, size_bytes, type, uploaded_by_role)
     VALUES ($1, $2, $3, $4, $5, $6, 'document', 'advisor')`,
    [clientId, fileName, category, storagePath, sizeLabel, contentBuffer.byteLength]
  );

  return { saved: true, wasUpdate: false, name: fileName };
}

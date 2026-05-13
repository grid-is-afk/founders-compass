import path from "path";
import { supabase, STORAGE_BUCKET } from "./supabase.js";
import { query } from "../db.js";

const MAX_VISUAL_DOCS = 5;
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB

type BlockType = "document" | "image";
type MediaType = "application/pdf" | "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface VisualDoc {
  name: string;
  buffer: Buffer;
  blockType: BlockType;
  mediaType: MediaType;
}

function getImageMediaType(ext: string): MediaType | null {
  switch (ext) {
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png":  return "image/png";
    case ".gif":  return "image/gif";
    case ".webp": return "image/webp";
    default:      return null;
  }
}

export async function fetchClientVisualDocs(
  clientId: string,
  advisorId: string
): Promise<VisualDoc[]> {
  // Auth: confirm client belongs to this advisor
  const authCheck = await query(
    "SELECT id FROM clients WHERE id = $1 AND advisor_id = $2",
    [clientId, advisorId]
  );
  if (authCheck.rows.length === 0) return [];

  // Fetch scanned/image PDFs and actual image files
  const docsResult = await query(
    `SELECT id, name, file_url, size_bytes
     FROM documents
     WHERE client_id = $1
       AND file_url IS NOT NULL
       AND file_url NOT LIKE '/uploads/%'
       AND (
         is_image_pdf = true
         OR file_url ~* '\\.(jpg|jpeg|png|gif|webp)$'
       )
     ORDER BY uploaded_at DESC
     LIMIT $2`,
    [clientId, MAX_VISUAL_DOCS]
  );

  const result: VisualDoc[] = [];

  for (const doc of docsResult.rows as Array<{
    id: string;
    name: string;
    file_url: string;
    size_bytes: number;
  }>) {
    if (doc.size_bytes > MAX_DOC_BYTES) continue;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(doc.file_url);

    if (error || !data) {
      console.error(`Vision: failed to download ${doc.name}:`, error);
      continue;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = path.extname(doc.file_url).toLowerCase();
    const imageMediaType = getImageMediaType(ext);

    if (imageMediaType) {
      // Actual image file — use image block
      result.push({ name: doc.name, buffer, blockType: "image", mediaType: imageMediaType });
    } else {
      // Scanned PDF — use document block
      result.push({ name: doc.name, buffer, blockType: "document", mediaType: "application/pdf" });
    }
  }

  return result;
}

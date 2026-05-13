import { supabase, STORAGE_BUCKET } from "./supabase.js";
import { query } from "../db.js";

const MAX_IMAGE_DOCS = 5;
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB per doc

export interface ImageDoc {
  name: string;
  buffer: Buffer;
}

export async function fetchClientImageDocs(
  clientId: string,
  advisorId: string
): Promise<ImageDoc[]> {
  // Auth: confirm client belongs to this advisor
  const authCheck = await query(
    "SELECT id FROM clients WHERE id = $1 AND advisor_id = $2",
    [clientId, advisorId]
  );
  if (authCheck.rows.length === 0) return [];

  const docsResult = await query(
    `SELECT id, name, file_url, size_bytes
     FROM documents
     WHERE client_id = $1
       AND is_image_pdf = true
       AND file_url IS NOT NULL
       AND file_url NOT LIKE '/uploads/%'
     ORDER BY uploaded_at DESC
     LIMIT $2`,
    [clientId, MAX_IMAGE_DOCS]
  );

  const result: ImageDoc[] = [];

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

    result.push({
      name: doc.name,
      buffer: Buffer.from(await data.arrayBuffer()),
    });
  }

  return result;
}

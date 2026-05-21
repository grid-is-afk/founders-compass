import { supabase, STORAGE_BUCKET } from "./supabase.js";
import { query } from "../db.js";

export async function saveReportToDataRoom(
  clientId: string,
  reportTitle: string,
  content: string,
  folder?: string
): Promise<void> {
  if (!content.trim()) return;

  const category = folder ?? "Reports";
  const { randomUUID } = await import("crypto");
  const fileName = `${reportTitle.replace(/[^a-zA-Z0-9 _-]/g, "")} — ${new Date().toISOString().slice(0, 10)}.md`;
  const storagePath = `clients/${clientId}/reports/${randomUUID()}.md`;
  const buffer = Buffer.from(content, "utf-8");

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: "text/markdown", upsert: false });

  if (uploadError) {
    console.error("Report upload to Supabase failed:", uploadError.message);
    return;
  }

  const sizeLabel =
    buffer.byteLength < 1024
      ? `${buffer.byteLength} B`
      : `${(buffer.byteLength / 1024).toFixed(0)} KB`;

  await query(
    `INSERT INTO documents (client_id, name, category, file_url, size, size_bytes, type, uploaded_by_role)
     VALUES ($1, $2, $3, $4, $5, $6, 'document', 'advisor')`,
    [clientId, fileName, category, storagePath, sizeLabel, buffer.byteLength]
  );
}

import dotenv from "dotenv";
dotenv.config();

import { query } from "../db.js";
import { ingestDocument } from "../lib/ingestion.js";

async function backfill() {
  // Only process documents that have no chunks yet (skip already-indexed)
  const docsResult = await query(
    `SELECT d.id, d.client_id, d.name FROM documents d
     WHERE d.client_id IS NOT NULL
       AND d.file_url IS NOT NULL
       AND d.file_url NOT LIKE '/uploads/%'
       AND NOT EXISTS (
         SELECT 1 FROM document_chunks dc WHERE dc.document_id = d.id
       )
     ORDER BY d.uploaded_at ASC`
  );

  const docs = docsResult.rows as Array<{ id: string; client_id: string; name: string }>;
  console.log(`Found ${docs.length} un-indexed documents to process.`);

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    try {
      await ingestDocument(doc.id, doc.client_id);
      succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Failed: ${doc.name} (${doc.id}) ${msg.slice(0, 120)}`);
      failed++;
    }
    // 21s delay to respect Voyage AI free tier limit (3 RPM)
    if (docs.indexOf(doc) < docs.length - 1) {
      await new Promise((r) => setTimeout(r, 21_000));
    }
  }

  console.log(`\nBackfill complete: ${succeeded} processed, ${skipped} skipped, ${failed} failed.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill script error:", err);
  process.exit(1);
});

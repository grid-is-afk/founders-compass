import dotenv from "dotenv";
dotenv.config();

import { query } from "../db.js";
import { ingestDocument } from "../lib/ingestion.js";

async function backfill() {
  const docsResult = await query(
    `SELECT id, client_id, name FROM documents
     WHERE client_id IS NOT NULL
       AND file_url IS NOT NULL
       AND file_url NOT LIKE '/uploads/%'
     ORDER BY uploaded_at ASC`
  );

  const docs = docsResult.rows as Array<{ id: string; client_id: string; name: string }>;
  console.log(`Found ${docs.length} documents to process.`);

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
    // Small delay to stay within Voyage AI rate limits
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nBackfill complete: ${succeeded} processed, ${skipped} skipped, ${failed} failed.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill script error:", err);
  process.exit(1);
});

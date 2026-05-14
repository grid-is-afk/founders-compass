/**
 * Re-embeds all documents in the DB using voyage-4-lite.
 * Safe to run multiple times — ingestDocument deletes old chunks before inserting.
 *
 * Run with:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx server/scripts/reembed-voyage4.ts
 */

import { query } from "../db.js";
import { ingestDocument } from "../lib/ingestion.js";
import pool from "../db.js";

async function main() {
  const result = await query(
    `SELECT id, client_id, name, file_url FROM documents
     WHERE client_id IS NOT NULL
       AND file_url IS NOT NULL
       AND file_url NOT LIKE '/uploads/%'
     ORDER BY client_id, uploaded_at`
  );

  const docs = result.rows as Array<{
    id: string;
    client_id: string;
    name: string;
    file_url: string;
  }>;

  console.log(`\nFound ${docs.length} documents to re-embed with voyage-4-lite.\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const prefix = `[${i + 1}/${docs.length}]`;

    try {
      await ingestDocument(doc.id, doc.client_id);
      console.log(`${prefix} ✓  ${doc.name}`);
      success++;
    } catch (err) {
      console.error(`${prefix} ✗  ${doc.name} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Re-embed complete
  ✓ Success : ${success}
  ✗ Failed  : ${failed}
  → Skipped : ${skipped} (images/unsupported)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(console.error).finally(() => pool.end());

/**
 * One-time script: moves existing files from the Railway volume (/app/server/uploads)
 * into Supabase Storage and updates the file_url column in the DB.
 *
 * Run after deploying the Supabase storage code changes:
 *   railway run npx tsx server/scripts/migrate-uploads.ts
 */

import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { query } from "../db.js";
import { supabase, STORAGE_BUCKET } from "../lib/supabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(__dirname, "..", "uploads");

async function main() {
  console.log(`Reading uploads from: ${UPLOADS_DIR}`);

  const { rows } = await query(
    `SELECT id, file_url, client_id, prospect_id FROM documents WHERE file_url LIKE '/uploads/%'`
  );

  console.log(`Found ${rows.length} document(s) to migrate\n`);

  let success = 0;
  let failed = 0;

  for (const doc of rows) {
    const filename = path.basename(doc.file_url as string);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`SKIP  ${doc.id} — file not found at ${filePath}`);
      failed++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const prefix = doc.client_id
        ? `clients/${doc.client_id}`
        : `prospects/${doc.prospect_id}`;
      const bucketPath = `${prefix}/${filename}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(bucketPath, buffer, { upsert: true });

      if (error) throw error;

      await query("UPDATE documents SET file_url = $1 WHERE id = $2", [
        bucketPath,
        doc.id,
      ]);

      console.log(`OK    ${doc.id}  →  ${bucketPath}`);
      success++;
    } catch (err) {
      console.error(`FAIL  ${doc.id}`, err);
      failed++;
    }
  }

  console.log(`\nDone. ${success} migrated, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

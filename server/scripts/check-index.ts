import dotenv from "dotenv";
dotenv.config();
import { query } from "../db.js";

async function main() {
  // All indexed documents grouped by client
  const indexed = await query(`
    SELECT c.name as client_name, d.name as doc_name, COUNT(dc.id)::int as chunks
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    JOIN clients c ON c.id = dc.client_id
    GROUP BY c.name, d.name
    ORDER BY c.name, d.name
  `);

  console.log("\n=== INDEXED DOCUMENTS ===");
  let currentClient = "";
  for (const r of indexed.rows) {
    if (r.client_name !== currentClient) {
      currentClient = r.client_name;
      console.log(`\n[${r.client_name}]`);
    }
    console.log(`  ${r.doc_name} — ${r.chunks} chunks`);
  }
  console.log(`\nTotal indexed docs: ${indexed.rows.length}`);

  // Clients with NO indexed docs
  const noIndex = await query(`
    SELECT c.name, COUNT(d.id)::int as total_docs
    FROM clients c
    LEFT JOIN documents d ON d.client_id = c.id
    WHERE c.archived = false
      AND NOT EXISTS (
        SELECT 1 FROM document_chunks dc
        JOIN documents d2 ON d2.id = dc.document_id
        WHERE d2.client_id = c.id
      )
    GROUP BY c.name
    ORDER BY c.name
  `);

  console.log("\n=== CLIENTS WITH NO INDEXED DOCS ===");
  for (const r of noIndex.rows) {
    console.log(`  ${r.name} (${r.total_docs} docs in data room)`);
  }

  // Nate specifically
  const nate = await query(`
    SELECT c.id, c.name,
      (SELECT COUNT(*) FROM documents d WHERE d.client_id = c.id) as total_docs,
      (SELECT COUNT(*) FROM document_chunks dc JOIN documents d ON d.id = dc.document_id WHERE d.client_id = c.id) as indexed_chunks
    FROM clients c
    WHERE c.name ILIKE '%nate%' OR c.name ILIKE '%herkelman%'
  `);

  console.log("\n=== NATE HERKELMAN ===");
  if (nate.rows.length === 0) {
    console.log("  Not found in clients table");
  } else {
    for (const r of nate.rows) {
      console.log(`  ${r.name} (id: ${r.id})`);
      console.log(`  Documents in Data Room: ${r.total_docs}`);
      console.log(`  Indexed chunks: ${r.indexed_chunks}`);
    }
  }

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });

import dotenv from "dotenv";
dotenv.config();
import { retrieveChunks } from "../lib/retrieval.js";
import { query } from "../db.js";

// Get Nate's client ID
const nate = await query(
  "SELECT id, name FROM clients WHERE name ILIKE '%nate%' OR name ILIKE '%herkelman%' LIMIT 1"
);
if (nate.rows.length === 0) { console.log("Nate not found"); process.exit(1); }

const { id: clientId, name } = nate.rows[0] as { id: string; name: string };
console.log(`Testing retrieval for: ${name} (${clientId})\n`);

const queries = [
  "What does the operating agreement say about equity splits?",
  "operating agreement membership interests ownership",
  "Uppit AI equity ownership percentage",
];

for (const q of queries) {
  console.log(`Query: "${q}"`);
  const chunks = await retrieveChunks(q, clientId, 15);
  if (chunks.length === 0) {
    console.log("  → No results\n");
  } else {
    for (const c of chunks.slice(0, 3)) {
      const docName = (c.metadata.document_name as string) ?? "unknown";
      console.log(`  → [${(c.similarity * 100).toFixed(1)}%] ${docName}`);
    }
    console.log();
  }
}

process.exit(0);

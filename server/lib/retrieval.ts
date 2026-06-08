import { embedQuery } from "./voyageai.js";
import { query } from "../db.js";

export interface RetrievedChunk {
  document_id: string;
  chunk_text: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

// Common document-type keywords that may appear in queries but not in
// document content — used to trigger name-based fallback retrieval.
const DOC_NAME_KEYWORDS = [
  "operating agreement",
  "articles of organization",
  "formation filing",
  "articles of incorporation",
  "buy-sell",
  "buy sell",
  "shareholder agreement",
  "membership interest",
  "engagement letter",
  "retainer",
  "letter of intent",
  "loi",
  "promissory note",
  "loan agreement",
  "security agreement",
  "sba",
  "balance sheet",
  "income statement",
  "p&l",
  "profit and loss",
  "tax return",
  "w-2",
  "1099",
  "contract",
  "agreement",
  "amendment",
  "addendum",
  "invoice",
  "statement of work",
  "sow",
];

function extractDocNameKeywords(userQuery: string): string[] {
  const lower = userQuery.toLowerCase();
  return DOC_NAME_KEYWORDS.filter((kw) => lower.includes(kw));
}

export async function retrieveChunks(
  userQuery: string,
  clientId: string,
  topK = 15,
  // Pass 3 pulls TFO's firm-wide methodology knowledge base (proprietary IP).
  // Licensees must NOT receive it — call with includeMethodology=false.
  includeMethodology = true
): Promise<RetrievedChunk[]> {
  if (!userQuery.trim()) return [];

  const embedding = await embedQuery(userQuery);
  const vectorLiteral = `[${embedding.join(",")}]`;

  // --- Pass 1: vector similarity search ---
  // Filter to matching dimension only — old 1024-dim chunks (pre-voyage-4-lite)
  // cause a Postgres error if compared against a 512-dim query vector.
  const queryDim = embedding.length;
  const vectorResult = await query(
    `SELECT document_id,
            chunk_text,
            metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     WHERE client_id = $2
       AND vector_dims(embedding) = $4
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorLiteral, clientId, topK, queryDim]
  );

  const vectorChunks = vectorResult.rows as RetrievedChunk[];

  // --- Pass 2: keyword match on document names ---
  // Catches cases where the user's terminology differs from document content
  // (e.g. "equity splits" vs "membership interests" in an operating agreement)
  const docKeywords = extractDocNameKeywords(userQuery);
  let nameChunks: RetrievedChunk[] = [];

  if (docKeywords.length > 0) {
    const likePatterns = docKeywords.map((kw) => `%${kw}%`);
    // Build OR conditions for each keyword
    const whereClauses = likePatterns
      .map((_, i) => `metadata->>'document_name' ILIKE $${i + 3}`)
      .join(" OR ");

    const nameResult = await query(
      `SELECT document_id,
              chunk_text,
              metadata,
              0.5 AS similarity
       FROM document_chunks
       WHERE client_id = $1
         AND (${whereClauses})
       LIMIT $2`,
      [clientId, topK, ...likePatterns]
    );
    nameChunks = nameResult.rows as RetrievedChunk[];
  }

  // --- Pass 3: methodology knowledge base (global — no client_id filter) ---
  // Top 5 methodology chunks per query — background framework knowledge.
  // Dimension-gated same as Pass 1 to avoid vector dimension mismatches.
  const METHODOLOGY_TOP_K = 5;
  const methodologyChunks: RetrievedChunk[] = includeMethodology
    ? ((
        await query(
          `SELECT ''::text AS document_id,
                  chunk_text,
                  metadata || '{"source":"methodology"}'::jsonb AS metadata,
                  1 - (embedding <=> $1::vector) AS similarity
           FROM methodology_chunks
           WHERE vector_dims(embedding) = $3
           ORDER BY embedding <=> $1::vector
           LIMIT $2`,
          [vectorLiteral, METHODOLOGY_TOP_K, queryDim]
        )
      ).rows as RetrievedChunk[])
    : [];

  // --- Merge: vector results first, then name-matched chunks, then methodology ---
  const seen = new Set(vectorChunks.map((c) => c.chunk_text));
  const merged = [...vectorChunks];

  for (const c of nameChunks) {
    if (!seen.has(c.chunk_text)) {
      merged.push(c);
      seen.add(c.chunk_text);
    }
  }

  for (const c of methodologyChunks) {
    if (!seen.has(c.chunk_text)) {
      merged.push(c);
      seen.add(c.chunk_text);
    }
  }

  return merged.slice(0, topK + METHODOLOGY_TOP_K);
}

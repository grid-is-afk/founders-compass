import { embedQuery } from "./voyageai.js";
import { query } from "../db.js";

export interface RetrievedChunk {
  chunk_text: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function retrieveChunks(
  userQuery: string,
  clientId: string,
  topK = 8
): Promise<RetrievedChunk[]> {
  if (!userQuery.trim()) return [];

  const embedding = await embedQuery(userQuery);
  const vectorLiteral = `[${embedding.join(",")}]`;

  const result = await query(
    `SELECT chunk_text,
            metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     WHERE client_id = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorLiteral, clientId, topK]
  );

  return result.rows as RetrievedChunk[];
}

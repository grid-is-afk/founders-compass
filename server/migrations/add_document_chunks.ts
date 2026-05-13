import pool from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        client_id    UUID NOT NULL REFERENCES clients(id)   ON DELETE CASCADE,
        chunk_index  INTEGER NOT NULL,
        chunk_text   TEXT NOT NULL,
        embedding    vector(512),
        metadata     JSONB NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_client_id_idx
        ON document_chunks (client_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx
        ON document_chunks (document_id)
    `);

    // IVFFlat index for fast cosine similarity search
    // Note: requires at least one row to build — safe to create on empty table
    await client.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
        ON document_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    `);

    await client.query("COMMIT");
    console.log("Migration complete: document_chunks table created.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

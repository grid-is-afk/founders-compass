import pool from "../db.js";
import dotenv from "dotenv";
dotenv.config();

export async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS methodology_chunks (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_name TEXT NOT NULL,
        file_name     TEXT NOT NULL,
        chunk_index   INTEGER NOT NULL,
        chunk_text    TEXT NOT NULL,
        embedding     vector(512),
        metadata      JSONB NOT NULL DEFAULT '{}',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS methodology_chunks_embedding_idx
        ON methodology_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS methodology_chunks_document_name_idx
        ON methodology_chunks (document_name)
    `);

    await client.query("COMMIT");
    console.log("Migration complete: methodology_chunks table created.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Allow direct invocation: npx tsx server/migrations/add_methodology_chunks.ts
run().finally(() => pool.end());

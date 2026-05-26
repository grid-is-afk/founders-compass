import pool from "../db.js";

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS source_meeting_id UUID
          REFERENCES meetings(id) ON DELETE CASCADE
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS documents_source_meeting_id_idx
        ON documents(source_meeting_id)
        WHERE source_meeting_id IS NOT NULL
    `);
    console.log("Migration complete: source_meeting_id added to documents.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

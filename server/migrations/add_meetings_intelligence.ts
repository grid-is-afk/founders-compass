import pool from "../db.js";

export async function up() {
  await pool.query(`
    ALTER TABLE meetings
    ADD COLUMN IF NOT EXISTS agenda TEXT,
    ADD COLUMN IF NOT EXISTS agenda_status TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS capture_notes TEXT,
    ADD COLUMN IF NOT EXISTS decisions JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS transcript_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
  `);
  console.log("Migration: extended meetings table with agenda/capture/transcript columns");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stakeholders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      notes TEXT,
      tier TEXT DEFAULT 'primary',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("Migration: created stakeholders table");

  await pool.query(`
    CREATE INDEX IF NOT EXISTS stakeholders_client_id_idx ON stakeholders(client_id);
  `);
  console.log("Migration: created stakeholders_client_id_idx");
}

up().catch(console.error).finally(() => pool.end());

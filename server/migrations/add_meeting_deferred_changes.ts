import pool from "../db.js";
import dotenv from "dotenv";
dotenv.config();

export async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_deferred_changes (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id              UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      source_meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      change_payload         JSONB NOT NULL,
      status                 TEXT NOT NULL DEFAULT 'pending',
      resolved_at            TIMESTAMPTZ,
      resolved_in_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Migration: created meeting_deferred_changes table");

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mdc_client_status
      ON meeting_deferred_changes (client_id, status);
  `);
  console.log("Migration: created idx_mdc_client_status");

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mdc_source_meeting
      ON meeting_deferred_changes (source_meeting_id);
  `);
  console.log("Migration: created idx_mdc_source_meeting");
}

up().catch(console.error).finally(() => pool.end());

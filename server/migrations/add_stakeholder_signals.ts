import pool from "../db.js";
import dotenv from "dotenv";
dotenv.config();

export async function up() {
  // ── stakeholder_signals table ──────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stakeholder_signals (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
      client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      signal_type    TEXT NOT NULL CHECK (signal_type IN (
        'manual_note', 'meeting_mention', 'sentiment',
        'email_received', 'email_sent', 'calendar_event', 'meeting_attended'
      )),
      sentiment      TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'at_risk')),
      value          TEXT,
      source_table   TEXT,
      source_id      UUID,
      created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
      ts             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Migration: created stakeholder_signals table");

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_stakeholder_signals_sh_ts
      ON stakeholder_signals (stakeholder_id, ts DESC);
  `);
  console.log("Migration: created idx_stakeholder_signals_sh_ts");

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_stakeholder_signals_client_ts
      ON stakeholder_signals (client_id, ts DESC);
  `);
  console.log("Migration: created idx_stakeholder_signals_client_ts");

  // ── ADD current_sentiment to stakeholders (safe: skip if already exists) ──
  // ADD COLUMN IF NOT EXISTS does not support inline CHECK in PostgreSQL,
  // so we use a DO block that checks information_schema first.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stakeholders' AND column_name = 'current_sentiment'
      ) THEN
        ALTER TABLE stakeholders
          ADD COLUMN current_sentiment TEXT
            CHECK (current_sentiment IN ('positive', 'neutral', 'negative', 'at_risk'));
      END IF;
    END;
    $$;
  `);
  console.log("Migration: added current_sentiment to stakeholders (if not exists)");

  // ── ADD sentiment_updated_at to stakeholders (safe: skip if already exists) ─
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stakeholders' AND column_name = 'sentiment_updated_at'
      ) THEN
        ALTER TABLE stakeholders
          ADD COLUMN sentiment_updated_at TIMESTAMPTZ;
      END IF;
    END;
    $$;
  `);
  console.log("Migration: added sentiment_updated_at to stakeholders (if not exists)");
}

up().catch(console.error).finally(() => pool.end());

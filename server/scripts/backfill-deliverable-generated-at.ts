/**
 * Backfill script: deliverable audit trail.
 *
 * For every deliverable where generated_at IS NULL, set:
 *   generated_at = COALESCE(updated_at, created_at)
 *
 * Keeps the "Generated X ago" subtitle values stable across the migration —
 * legacy rows continue to show the same date the UI showed before this column
 * existed (their last-touched timestamp, since that was the prior behaviour).
 *
 * Safe to run multiple times (idempotent on already-backfilled rows).
 */
import dotenv from "dotenv";
dotenv.config();
import pool from "../db.js";

async function backfill() {
  const result = await pool.query(
    `UPDATE deliverables
     SET generated_at = COALESCE(updated_at, created_at)
     WHERE generated_at IS NULL
     RETURNING id, title, generated_at`
  );

  if (result.rows.length === 0) {
    console.log("No rows needed backfill — generated_at already populated on all deliverables.");
    return;
  }

  console.log(`Backfilled ${result.rows.length} deliverable(s):`);
  console.table(
    result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      generated_at: r.generated_at,
    }))
  );
}

backfill().catch(console.error).finally(() => pool.end());

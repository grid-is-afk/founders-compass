/**
 * One-time migration: adds 'ready' to the deliverables.status CHECK constraint.
 *
 * The generate_report Copilot tool inserts status='ready' but the original
 * constraint only allowed ('pending', 'in_progress', 'complete'), causing
 * every deliverable insert to fail silently.
 *
 * Run against Railway:
 *   railway run npx tsx server/scripts/fix-deliverables-status-constraint.ts
 */

import "dotenv/config";
import { query } from "../db.js";

async function main() {
  console.log("Checking current deliverables status constraint...");

  const { rows } = await query(`
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'deliverables'::regclass
      AND contype = 'c'
      AND conname LIKE '%status%'
  `);

  if (rows.length === 0) {
    console.log("No status constraint found — table may already be unconstrained.");
  } else {
    console.log("Current constraint:", rows[0].definition);
  }

  const alreadyHasReady = rows.some((r: { definition: string }) =>
    r.definition.includes("ready")
  );

  if (alreadyHasReady) {
    console.log("✅ Constraint already includes 'ready' — no migration needed.");
    process.exit(0);
  }

  console.log("Applying migration...");

  await query(`
    ALTER TABLE deliverables
      DROP CONSTRAINT IF EXISTS deliverables_status_check;
  `);

  await query(`
    ALTER TABLE deliverables
      ADD CONSTRAINT deliverables_status_check
      CHECK (status IN ('pending', 'in_progress', 'complete', 'ready'));
  `);

  console.log("✅ Migration complete — deliverables.status now accepts 'ready'.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

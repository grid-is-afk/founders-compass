/**
 * Backfill script: UC-07 date unification.
 *
 * For each client where onboarded_at IS NOT NULL:
 *   - If no Q1 quarterly_plans row exists → INSERT with start_date = onboarded_at,
 *     review_date = onboarded_at + 90 days, status = 'active'.
 *   - If a Q1 row exists with NULL start_date → UPDATE start_date = onboarded_at;
 *     never overwrite a non-NULL review_date.
 *
 * Safe to run multiple times (idempotent on already-backfilled rows).
 */
import dotenv from "dotenv";
dotenv.config();
import pool from "../db.js";

async function backfill() {
  // All clients with an onboarded_at date
  const clientsRes = await pool.query<{
    id: string;
    name: string;
    onboarded_at: string;
  }>(
    `SELECT id, name, onboarded_at
     FROM clients
     WHERE onboarded_at IS NOT NULL
     ORDER BY name`
  );

  if (clientsRes.rows.length === 0) {
    console.log("No clients with onboarded_at found — nothing to backfill.");
    return;
  }

  console.log(`Found ${clientsRes.rows.length} client(s) with onboarded_at. Processing...\n`);

  const summary: Array<{
    client: string;
    onboarded_at: string;
    action: string;
    start_date: string;
    review_date: string;
  }> = [];

  for (const client of clientsRes.rows) {
    const onboardedDate = new Date(client.onboarded_at);
    const startDateStr = onboardedDate.toISOString().slice(0, 10);
    const year = onboardedDate.getFullYear();

    const existingRes = await pool.query<{
      id: string;
      start_date: string | null;
      review_date: string | null;
    }>(
      `SELECT id, start_date, review_date
       FROM quarterly_plans
       WHERE client_id = $1 AND quarter = 1
       LIMIT 1`,
      [client.id]
    );

    if (existingRes.rows.length === 0) {
      // No Q1 plan — insert one
      const reviewDate = new Date(onboardedDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      const reviewDateStr = reviewDate.toISOString().slice(0, 10);

      await pool.query(
        `INSERT INTO quarterly_plans
           (client_id, quarter, year, label, status, start_date, review_date)
         VALUES ($1, 1, $2, $3, 'active', $4, $5)`,
        [client.id, year, `Q1 ${year} Review`, startDateStr, reviewDateStr]
      );

      summary.push({
        client: client.name,
        onboarded_at: startDateStr,
        action: "INSERTED",
        start_date: startDateStr,
        review_date: reviewDateStr,
      });
    } else {
      const plan = existingRes.rows[0];

      if (plan.start_date !== null) {
        // Already backfilled — skip
        summary.push({
          client: client.name,
          onboarded_at: startDateStr,
          action: "SKIPPED (start_date already set)",
          start_date: plan.start_date,
          review_date: plan.review_date ?? "(null)",
        });
        continue;
      }

      // start_date is NULL — update it; preserve existing review_date if set
      if (plan.review_date === null) {
        const reviewDate = new Date(onboardedDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        const reviewDateStr = reviewDate.toISOString().slice(0, 10);

        await pool.query(
          `UPDATE quarterly_plans
           SET start_date = $1, review_date = $2, updated_at = NOW()
           WHERE id = $3`,
          [startDateStr, reviewDateStr, plan.id]
        );

        summary.push({
          client: client.name,
          onboarded_at: startDateStr,
          action: "UPDATED (set start_date + review_date)",
          start_date: startDateStr,
          review_date: reviewDateStr,
        });
      } else {
        // review_date already set — only update start_date
        await pool.query(
          `UPDATE quarterly_plans
           SET start_date = $1, updated_at = NOW()
           WHERE id = $2`,
          [startDateStr, plan.id]
        );

        summary.push({
          client: client.name,
          onboarded_at: startDateStr,
          action: "UPDATED (set start_date only, preserved review_date)",
          start_date: startDateStr,
          review_date: plan.review_date,
        });
      }
    }
  }

  console.log("Backfill complete:");
  console.table(summary);
}

backfill().catch(console.error).finally(() => pool.end());

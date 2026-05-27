import dotenv from "dotenv";
dotenv.config();
import pool from "../db.js";

async function seed() {
  // 1. Find Ginny's client record
  const clientRes = await pool.query(
    `SELECT id, name, current_quarter, current_year, onboarded_at
     FROM clients
     WHERE name = 'Ginny Test'`
  );

  if (clientRes.rows.length === 0) {
    console.error("ERROR: no client found matching 'ginny'");
    return;
  }
  if (clientRes.rows.length > 1) {
    console.log("Multiple matches — listing all:");
    console.table(clientRes.rows);
    console.error("ERROR: ambiguous, refine the name filter");
    return;
  }

  const client = clientRes.rows[0];
  console.log("Found client:");
  console.table([client]);

  // 1b. Set onboarded_at to 80 days ago so the Chapter 1 pill and Q1 countdown align
  //     (80 days ago + 90-day window ≈ 10 days remaining, matching the review_date we set below)
  await pool.query(
    `UPDATE clients
     SET onboarded_at = CURRENT_DATE - INTERVAL '80 days',
         updated_at   = NOW()
     WHERE id = $1`,
    [client.id]
  );
  console.log("\nSet onboarded_at = CURRENT_DATE - 80 days for Ginny Test");

  // 2. Check for existing Q1 2026 plan
  const existingRes = await pool.query(
    `SELECT id, quarter, year, status, review_date
     FROM quarterly_plans
     WHERE client_id = $1 AND quarter = 1 AND year = 2026`,
    [client.id]
  );

  let plan;
  if (existingRes.rows.length > 0) {
    console.log(`\nExisting Q1 2026 plan found (id=${existingRes.rows[0].id}). Updating review_date...`);
    const updateRes = await pool.query(
      `UPDATE quarterly_plans
       SET start_date  = CURRENT_DATE - INTERVAL '80 days',
           review_date = CURRENT_DATE + INTERVAL '10 days',
           status      = 'active',
           label       = COALESCE(label, 'Q1 2026 Review'),
           updated_at  = NOW()
       WHERE id = $1
       RETURNING *`,
      [existingRes.rows[0].id]
    );
    plan = updateRes.rows[0];
  } else {
    console.log("\nNo existing Q1 2026 plan. Inserting new row...");
    const insertRes = await pool.query(
      `INSERT INTO quarterly_plans (client_id, quarter, year, label, status, start_date, review_date)
       VALUES ($1, 1, 2026, 'Q1 2026 Review', 'active',
               CURRENT_DATE - INTERVAL '80 days',
               CURRENT_DATE + INTERVAL '10 days')
       RETURNING *`,
      [client.id]
    );
    plan = insertRes.rows[0];
  }

  console.log("\nResult:");
  console.table([plan]);

  const daysOut = Math.ceil(
    (new Date(plan.review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  console.log(`\nreview_date = ${plan.review_date} (~${daysOut} days out)`);
  console.log("Refresh Ginny's Client Dashboard — amber countdown banner with 'Prepare Review' button should now appear.");
}

seed().catch(console.error).finally(() => pool.end());

import pool from "../db.js";

export async function up() {
  await pool.query(`
    ALTER TABLE prospects
    ADD COLUMN IF NOT EXISTS nurture_call_date TIMESTAMPTZ;
  `);
  console.log("Migration: added nurture_call_date to prospects");
}

up().catch(console.error).finally(() => pool.end());

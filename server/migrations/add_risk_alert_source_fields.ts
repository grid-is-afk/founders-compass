import pool from "../db.js";

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE risk_alerts
        ADD COLUMN IF NOT EXISTS source_id   UUID,
        ADD COLUMN IF NOT EXISTS source_type TEXT
    `);
    console.log("Migration complete: source_id and source_type added to risk_alerts.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

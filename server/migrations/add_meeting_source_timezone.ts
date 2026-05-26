import pool from "../db.js";

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE meetings
        ADD COLUMN IF NOT EXISTS source_timezone TEXT
    `);
    console.log("Migration complete: source_timezone added to meetings.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

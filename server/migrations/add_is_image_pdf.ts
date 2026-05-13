import dotenv from "dotenv";
dotenv.config();
import pool from "../db.js";

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS is_image_pdf BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("Migration complete: is_image_pdf column added to documents.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

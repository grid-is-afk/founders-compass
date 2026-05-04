import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL?.includes("railway") || process.env.DATABASE_URL?.includes("rlwy") || process.env.DATABASE_URL?.includes("supabase"))
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function query(text: string, params?: unknown[]) {
  const result = await pool.query(text, params);
  return result;
}

export default pool;

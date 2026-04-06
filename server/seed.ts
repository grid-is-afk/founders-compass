import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import bcryptjs from "bcryptjs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __dirname = join(fileURLToPath(import.meta.url), "..");

async function seed() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  try {
    // Run schema
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    await pool.query(schema);
    console.log("Schema created successfully");

    // Create advisor
    const passwordHash = await bcryptjs.hash("Founders2026!", 12);
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      ["tom@foundersoffice.com", passwordHash, "Tom Powell", "advisor"]
    );
    const advisorId = userResult.rows[0].id;
    console.log("Advisor created:", advisorId);

    // Create client user account (so they can log into the client portal)
    const clientPasswordHash = await bcryptjs.hash("Client2026!", 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      ["client@foundersoffice.com", clientPasswordHash, "Test Client", "client"]
    );
    console.log("Client user created");

    console.log("\n=== Login Credentials ===");
    console.log("Advisor:");
    console.log("  Email: tom@foundersoffice.com");
    console.log("  Password: Founders2026!");
    console.log("");
    console.log("Client:");
    console.log("  Email: client@foundersoffice.com");
    console.log("  Password: Client2026!");
    console.log("========================\n");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await pool.end();
  }
}

seed();

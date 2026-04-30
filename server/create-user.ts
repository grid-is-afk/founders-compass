import bcryptjs from "bcryptjs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Usage: npx tsx server/create-user.ts "Full Name" "email@example.com" "TempPassword123"
// Role defaults to "advisor". Pass a 4th arg to override: "admin" | "client"

const [, , name, email, password, role = "advisor"] = process.argv;

if (!name || !email || !password) {
  console.error("Usage: npx tsx server/create-user.ts \"Full Name\" \"email@example.com\" \"TempPassword123\" [role]");
  process.exit(1);
}

if (!["advisor", "admin", "client"].includes(role)) {
  console.error(`Invalid role "${role}". Must be one of: advisor, admin, client`);
  process.exit(1);
}

async function createUser() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  try {
    const passwordHash = await bcryptjs.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3, role = $4
       RETURNING id, email, name, role`,
      [email, passwordHash, name, role]
    );

    const user = result.rows[0];
    console.log("\n=== User Created ===");
    console.log(`  Name:     ${user.name}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Role:     ${user.role}`);
    console.log(`  Password: ${password}`);
    console.log(`  ID:       ${user.id}`);
    console.log("====================\n");
    console.log("Share the email + password with the user. They can log in at the portal login page.");
  } catch (err) {
    console.error("Error creating user:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createUser();

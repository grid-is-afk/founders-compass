import { Router } from "express";
import bcryptjs from "bcryptjs";
import { query } from "../db.js";

const router = Router();

function requireAdmin(req: any, res: any): boolean {
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// GET /api/admin/users — list all advisor/admin users
router.get("/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE role IN ('advisor', 'admin')
       ORDER BY created_at DESC NULLS LAST`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /admin/users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/users — create a new advisor or admin user
router.post("/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, and role are required" });
  }
  if (!["advisor", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be advisor or admin" });
  }

  try {
    const passwordHash = await bcryptjs.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, name, email, role`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), role]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /admin/users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/users/:id — remove an advisor or admin user
router.delete("/users/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;

  if (req.user!.id === id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  try {
    const result = await query(
      `DELETE FROM users WHERE id = $1 AND role IN ('advisor', 'admin') RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /admin/users/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { isValidIanaTimezone } from "../lib/timezone.js";

const router = Router();

// PATCH /api/users/me — update the authenticated user's profile preferences
router.patch("/me", async (req, res) => {
  const { timezone, name } = req.body ?? {};

  if (timezone !== undefined && timezone !== null) {
    if (!isValidIanaTimezone(timezone)) {
      return res.status(400).json({ error: "Invalid IANA timezone" });
    }
  }

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return res.status(400).json({ error: "Name must be a non-empty string" });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (timezone !== undefined) {
    values.push(timezone);
    updates.push(`timezone = $${values.length}`);
  }
  if (name !== undefined) {
    values.push(name.trim());
    updates.push(`name = $${values.length}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No updatable fields provided" });
  }

  updates.push(`updated_at = NOW()`);
  values.push(req.user!.id);

  try {
    const result = await query(
      `UPDATE users SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, name, email, role, timezone`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/users/me error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";

const router = Router();

// Columns an advisor may patch directly.
const ALLOWED_UPDATE_COLUMNS = new Set([
  "title",
  "description",
  "status",
  "sort_order",
  "plan_id",
]);

// GET /api/quarterly-objectives?client_id=xxx[&quarter=&year=]
router.get("/", async (req, res) => {
  const { client_id, quarter, year } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClientAccess(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const conditions = ["client_id = $1"];
    const values: unknown[] = [client_id];
    if (quarter !== undefined) {
      values.push(Number(quarter));
      conditions.push(`quarter = $${values.length}`);
    }
    if (year !== undefined) {
      values.push(Number(year));
      conditions.push(`year = $${values.length}`);
    }

    const result = await query(
      `SELECT * FROM quarterly_objectives
        WHERE ${conditions.join(" AND ")}
        ORDER BY year DESC, quarter DESC, sort_order ASC, created_at ASC`,
      values
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /quarterly-objectives error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quarterly-objectives  (advisor manual add — defaults to confirmed)
router.post("/", async (req, res) => {
  const { client_id, quarter, year, title, description, plan_id, status } = req.body;
  if (!client_id || quarter === undefined || year === undefined || !title) {
    return res
      .status(400)
      .json({ error: "client_id, quarter, year, and title required" });
  }

  try {
    if (!(await verifyClientAccess(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO quarterly_objectives
         (client_id, quarter, year, title, description, plan_id, status, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'advisor') RETURNING *`,
      [
        client_id,
        quarter,
        year,
        title,
        description ?? null,
        plan_id ?? null,
        status ?? "confirmed",
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /quarterly-objectives error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/quarterly-objectives/:id
router.patch("/:id", async (req, res) => {
  const fields: Record<string, unknown> = {};
  for (const k of Object.keys(req.body)) {
    if (ALLOWED_UPDATE_COLUMNS.has(k)) fields[k] = req.body[k];
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No updatable fields provided" });
  }

  try {
    const existing = await query(
      "SELECT client_id FROM quarterly_objectives WHERE id = $1",
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Objective not found" });
    }
    if (!(await verifyClientAccess(existing.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);
    const updated = await query(
      `UPDATE quarterly_objectives SET ${setClauses.join(", ")}, updated_at = NOW()
        WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );

    return res.json(updated.rows[0]);
  } catch (err) {
    console.error("PATCH /quarterly-objectives/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/quarterly-objectives/:id
router.delete("/:id", async (req, res) => {
  try {
    const existing = await query(
      "SELECT client_id FROM quarterly_objectives WHERE id = $1",
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Objective not found" });
    }
    if (!(await verifyClientAccess(existing.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM quarterly_objectives WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /quarterly-objectives/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

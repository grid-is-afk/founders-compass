import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/clients
router.get("/", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM clients WHERE advisor_id = $1 ORDER BY name",
      [req.user!.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/clients
router.post("/", async (req, res) => {
  const {
    name,
    contact_name,
    contact_email,
    revenue,
    stage,
    current_quarter,
    current_year,
    capital_readiness,
    customer_capital,
    performance_score,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Client name is required" });
  }

  try {
    const result = await query(
      `INSERT INTO clients
         (advisor_id, name, contact_name, contact_email, revenue, stage,
          current_quarter, current_year, capital_readiness, customer_capital, performance_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user!.id,
        name,
        contact_name ?? null,
        contact_email ?? null,
        revenue ?? null,
        stage ?? "Q1 — Discover",
        current_quarter ?? 1,
        current_year ?? 2026,
        capital_readiness ?? 0,
        customer_capital ?? 0,
        performance_score ?? 0,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/clients/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM clients WHERE id = $1 AND advisor_id = $2",
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /clients/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/clients/:id
router.patch("/:id", async (req, res) => {
  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE clients
       SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} AND advisor_id = $${keys.length + 2}
       RETURNING *`,
      [...values, req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /clients/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/clients/:id
router.delete("/:id", async (req, res) => {
  try {
    await query(
      "DELETE FROM clients WHERE id = $1 AND advisor_id = $2",
      [req.params.id, req.user!.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /clients/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

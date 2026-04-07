import { Router } from "express";
import { query } from "../db.js";

const router = Router();

async function verifyClient(clientId: string, userId: string, userRole: string) {
  const col = userRole === "client" ? "user_id" : "advisor_id";
  const result = await query(
    `SELECT id FROM clients WHERE id = $1 AND ${col} = $2`,
    [clientId, userId]
  );
  return result.rows.length > 0;
}

// GET /api/instruments?client_id=xxx
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClient(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      "SELECT * FROM instruments WHERE client_id = $1 ORDER BY created_at",
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /instruments error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/instruments
router.post("/", async (req, res) => {
  const { client_id, type, name, status, completed_date, linked_phase } = req.body;
  if (!client_id || !type || !name) {
    return res.status(400).json({ error: "client_id, type, and name required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO instruments (client_id, type, name, status, completed_date, linked_phase)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        client_id,
        type,
        name,
        status ?? "pending",
        completed_date ?? null,
        linked_phase ?? null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /instruments error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/instruments/:id
router.patch("/:id", async (req, res) => {
  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const iResult = await query("SELECT * FROM instruments WHERE id = $1", [
      req.params.id,
    ]);
    if (iResult.rows.length === 0) {
      return res.status(404).json({ error: "Instrument not found" });
    }
    if (!(await verifyClient(iResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE instruments SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /instruments/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/instruments/:id
router.delete("/:id", async (req, res) => {
  try {
    const iResult = await query("SELECT * FROM instruments WHERE id = $1", [
      req.params.id,
    ]);
    if (iResult.rows.length === 0) {
      return res.status(404).json({ error: "Instrument not found" });
    }
    if (!(await verifyClient(iResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM instruments WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /instruments/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";

const router = Router();

async function verifyClient(clientId: string, advisorId: string) {
  const result = await query(
    "SELECT id FROM clients WHERE id = $1 AND advisor_id = $2",
    [clientId, advisorId]
  );
  return result.rows.length > 0;
}

// GET /api/meetings?client_id=xxx
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClient(client_id as string, req.user!.id))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      "SELECT * FROM meetings WHERE client_id = $1 ORDER BY date DESC",
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /meetings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/meetings
router.post("/", async (req, res) => {
  const { client_id, type, date, notes, status } = req.body;
  if (!client_id) {
    return res.status(400).json({ error: "client_id required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO meetings (client_id, type, date, notes, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        client_id,
        type ?? null,
        date ?? null,
        notes ?? null,
        status ?? "scheduled",
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /meetings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/meetings/:id
router.patch("/:id", async (req, res) => {
  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const mResult = await query("SELECT * FROM meetings WHERE id = $1", [
      req.params.id,
    ]);
    if (mResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (!(await verifyClient(mResult.rows[0].client_id, req.user!.id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE meetings SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /meetings/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/meetings/:id
router.delete("/:id", async (req, res) => {
  try {
    const mResult = await query("SELECT * FROM meetings WHERE id = $1", [
      req.params.id,
    ]);
    if (mResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (!(await verifyClient(mResult.rows[0].client_id, req.user!.id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM meetings WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /meetings/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

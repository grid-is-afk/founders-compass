import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const ALLOWED_COLUMNS = new Set(["label", "status", "risk", "recommendation"]);

async function verifyClient(clientId: string, userId: string, userRole: string) {
  const col = userRole === "client" ? "user_id" : "advisor_id";
  const result = await query(
    `SELECT id FROM clients WHERE id = $1 AND ${col} = $2`,
    [clientId, userId]
  );
  return result.rows.length > 0;
}

// GET /api/protection?client_id=xxx
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
      "SELECT * FROM protection_items WHERE client_id = $1 ORDER BY category, label",
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /protection error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/protection
router.post("/", async (req, res) => {
  const { client_id, category, label, status, risk, recommendation } = req.body;
  if (!client_id || !category || !label) {
    return res.status(400).json({ error: "client_id, category, and label required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO protection_items (client_id, category, label, status, risk, recommendation)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        client_id,
        category,
        label,
        status ?? "review",
        risk ?? null,
        recommendation ?? null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /protection error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/protection/:id
router.patch("/:id", async (req, res) => {
  const raw = req.body;
  const fields: Record<string, unknown> = {};
  for (const k of Object.keys(raw)) {
    if (ALLOWED_COLUMNS.has(k)) fields[k] = raw[k];
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const pResult = await query(
      "SELECT * FROM protection_items WHERE id = $1",
      [req.params.id]
    );
    if (pResult.rows.length === 0) {
      return res.status(404).json({ error: "Protection item not found" });
    }
    if (!(await verifyClient(pResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE protection_items SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /protection/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/protection/:id
router.delete("/:id", async (req, res) => {
  try {
    const pResult = await query(
      "SELECT * FROM protection_items WHERE id = $1",
      [req.params.id]
    );
    if (pResult.rows.length === 0) {
      return res.status(404).json({ error: "Protection item not found" });
    }
    if (!(await verifyClient(pResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM protection_items WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /protection/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

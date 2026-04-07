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

// GET /api/risk-alerts?client_id=xxx
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
      "SELECT * FROM risk_alerts WHERE client_id = $1 ORDER BY severity DESC, created_at DESC",
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /risk-alerts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/risk-alerts
router.post("/", async (req, res) => {
  const { client_id, title, detail, severity } = req.body;
  if (!client_id || !title) {
    return res.status(400).json({ error: "client_id and title required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO risk_alerts (client_id, title, detail, severity)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [client_id, title, detail ?? null, severity ?? "medium"]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /risk-alerts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/risk-alerts/:id
router.patch("/:id", async (req, res) => {
  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const rResult = await query("SELECT * FROM risk_alerts WHERE id = $1", [
      req.params.id,
    ]);
    if (rResult.rows.length === 0) {
      return res.status(404).json({ error: "Risk alert not found" });
    }
    if (!(await verifyClient(rResult.rows[0].client_id, req.user!.id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await query(
      `UPDATE risk_alerts SET ${setClauses.join(", ")}
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /risk-alerts/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/risk-alerts/:id
router.delete("/:id", async (req, res) => {
  try {
    const rResult = await query("SELECT * FROM risk_alerts WHERE id = $1", [
      req.params.id,
    ]);
    if (rResult.rows.length === 0) {
      return res.status(404).json({ error: "Risk alert not found" });
    }
    if (!(await verifyClient(rResult.rows[0].client_id, req.user!.id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM risk_alerts WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /risk-alerts/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

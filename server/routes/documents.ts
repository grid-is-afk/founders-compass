import { Router } from "express";
import { query } from "../db.js";

const router = Router();

async function verifyClientAccess(clientId: string, userId: string, userRole: string) {
  const col = userRole === "client" ? "user_id" : "advisor_id";
  const result = await query(
    `SELECT id FROM clients WHERE id = $1 AND ${col} = $2`,
    [clientId, userId]
  );
  return result.rows.length > 0;
}

// GET /api/documents?client_id=xxx
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClientAccess(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      "SELECT * FROM documents WHERE client_id = $1 ORDER BY uploaded_at DESC",
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /documents error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/documents
router.post("/", async (req, res) => {
  const { client_id, name, category, file_url, size, type } = req.body;
  if (!client_id || !name) {
    return res.status(400).json({ error: "client_id and name required" });
  }

  try {
    if (!(await verifyClientAccess(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO documents (client_id, name, category, file_url, size, type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        client_id,
        name,
        category ?? null,
        file_url ?? null,
        size ?? null,
        type ?? null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /documents error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", async (req, res) => {
  try {
    const dResult = await query("SELECT * FROM documents WHERE id = $1", [
      req.params.id,
    ]);
    if (dResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    if (!(await verifyClientAccess(dResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM documents WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /documents/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

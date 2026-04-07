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

// GET /api/assessments?client_id=xxx
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClientAccess(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const assessments = await query(
      "SELECT * FROM assessments WHERE client_id = $1 ORDER BY created_at DESC",
      [client_id]
    );

    // Attach factors to each assessment
    const results = await Promise.all(
      assessments.rows.map(async (a) => {
        const factors = await query(
          "SELECT * FROM assessment_factors WHERE assessment_id = $1 ORDER BY sort_order",
          [a.id]
        );
        return { ...a, factors: factors.rows };
      })
    );

    return res.json(results);
  } catch (err) {
    console.error("GET /assessments error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/assessments — create or replace a full assessment with factors
router.put("/", async (req, res) => {
  const { client_id, type, completed_date, factors } = req.body;

  if (!client_id || !type) {
    return res.status(400).json({ error: "client_id and type required" });
  }

  try {
    if (!(await verifyClientAccess(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Delete existing assessment of this type for this client
    await query(
      "DELETE FROM assessments WHERE client_id = $1 AND type = $2",
      [client_id, type]
    );

    // Insert new assessment
    const aResult = await query(
      `INSERT INTO assessments (client_id, type, completed_date)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [client_id, type, completed_date ?? null]
    );
    const assessment = aResult.rows[0];

    // Insert factors
    if (Array.isArray(factors) && factors.length > 0) {
      for (let i = 0; i < factors.length; i++) {
        const f = factors[i];
        await query(
          `INSERT INTO assessment_factors
             (assessment_id, factor_name, category, score, rating, considerations, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            assessment.id,
            f.factor_name,
            f.category ?? null,
            f.score ?? null,
            f.rating ?? null,
            f.considerations ?? null,
            i,
          ]
        );
      }
    }

    const factorsResult = await query(
      "SELECT * FROM assessment_factors WHERE assessment_id = $1 ORDER BY sort_order",
      [assessment.id]
    );

    return res.status(201).json({ ...assessment, factors: factorsResult.rows });
  } catch (err) {
    console.error("PUT /assessments error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/assessments/:id
router.get("/:id", async (req, res) => {
  try {
    const aResult = await query("SELECT * FROM assessments WHERE id = $1", [
      req.params.id,
    ]);
    if (aResult.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    const assessment = aResult.rows[0];

    if (!(await verifyClientAccess(assessment.client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const factors = await query(
      "SELECT * FROM assessment_factors WHERE assessment_id = $1 ORDER BY sort_order",
      [assessment.id]
    );

    return res.json({ ...assessment, factors: factors.rows });
  } catch (err) {
    console.error("GET /assessments/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/assessments/:id
router.delete("/:id", async (req, res) => {
  try {
    const aResult = await query("SELECT * FROM assessments WHERE id = $1", [
      req.params.id,
    ]);
    if (aResult.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    if (!(await verifyClientAccess(aResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM assessments WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /assessments/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

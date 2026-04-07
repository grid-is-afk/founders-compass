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

// GET /api/quarterly-plans?client_id=xxx
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClientAccess(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const plans = await query(
      "SELECT * FROM quarterly_plans WHERE client_id = $1 ORDER BY year DESC, quarter DESC",
      [client_id]
    );

    const results = await Promise.all(
      plans.rows.map(async (p) => {
        const phases = await query(
          "SELECT * FROM quarterly_phases WHERE plan_id = $1 ORDER BY sort_order",
          [p.id]
        );
        return { ...p, phases: phases.rows };
      })
    );

    return res.json(results);
  } catch (err) {
    console.error("GET /quarterly-plans error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/quarterly-plans
router.post("/", async (req, res) => {
  const { client_id, quarter, year, label, status, review_date, phases } = req.body;
  if (!client_id || !quarter || !year) {
    return res.status(400).json({ error: "client_id, quarter, and year required" });
  }

  try {
    if (!(await verifyClientAccess(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const planResult = await query(
      `INSERT INTO quarterly_plans (client_id, quarter, year, label, status, review_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        client_id,
        quarter,
        year,
        label ?? null,
        status ?? "draft",
        review_date ?? null,
      ]
    );
    const plan = planResult.rows[0];

    if (Array.isArray(phases) && phases.length > 0) {
      for (let i = 0; i < phases.length; i++) {
        const ph = phases[i];
        await query(
          `INSERT INTO quarterly_phases (plan_id, phase, label, status, completed_tasks, total_tasks, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            plan.id,
            ph.phase,
            ph.label ?? null,
            ph.status ?? "pending",
            ph.completed_tasks ?? 0,
            ph.total_tasks ?? 0,
            i,
          ]
        );
      }
    }

    const phasesResult = await query(
      "SELECT * FROM quarterly_phases WHERE plan_id = $1 ORDER BY sort_order",
      [plan.id]
    );

    return res.status(201).json({ ...plan, phases: phasesResult.rows });
  } catch (err) {
    console.error("POST /quarterly-plans error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/quarterly-plans/:id
router.patch("/:id", async (req, res) => {
  const { phases, ...fields } = req.body;
  const keys = Object.keys(fields);

  try {
    const pResult = await query(
      "SELECT * FROM quarterly_plans WHERE id = $1",
      [req.params.id]
    );
    if (pResult.rows.length === 0) {
      return res.status(404).json({ error: "Quarterly plan not found" });
    }
    if (!(await verifyClientAccess(pResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    let plan = pResult.rows[0];

    if (keys.length > 0) {
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
      const values = keys.map((k) => fields[k]);
      const updated = await query(
        `UPDATE quarterly_plans SET ${setClauses.join(", ")}, updated_at = NOW()
         WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, req.params.id]
      );
      plan = updated.rows[0];
    }

    if (Array.isArray(phases)) {
      await query("DELETE FROM quarterly_phases WHERE plan_id = $1", [
        req.params.id,
      ]);
      for (let i = 0; i < phases.length; i++) {
        const ph = phases[i];
        await query(
          `INSERT INTO quarterly_phases (plan_id, phase, label, status, completed_tasks, total_tasks, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.params.id,
            ph.phase,
            ph.label ?? null,
            ph.status ?? "pending",
            ph.completed_tasks ?? 0,
            ph.total_tasks ?? 0,
            i,
          ]
        );
      }
    }

    const phasesResult = await query(
      "SELECT * FROM quarterly_phases WHERE plan_id = $1 ORDER BY sort_order",
      [req.params.id]
    );

    return res.json({ ...plan, phases: phasesResult.rows });
  } catch (err) {
    console.error("PATCH /quarterly-plans/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/quarterly-plans/:id
router.delete("/:id", async (req, res) => {
  try {
    const pResult = await query(
      "SELECT * FROM quarterly_plans WHERE id = $1",
      [req.params.id]
    );
    if (pResult.rows.length === 0) {
      return res.status(404).json({ error: "Quarterly plan not found" });
    }
    if (!(await verifyClientAccess(pResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM quarterly_plans WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /quarterly-plans/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

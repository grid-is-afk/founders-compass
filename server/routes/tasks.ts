import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const ALLOWED_COLUMNS = new Set([
  "title",
  "assignee_id",
  "status",
  "priority",
  "due_date",
  "phase",
  "notes",
  "document_id",
  "skip_reason",
]);

// Helper: verify client access — team members can access any client, clients verify via user_id
async function verifyClient(clientId: string, userId: string, userRole: string) {
  if (userRole !== "client") return true;
  const result = await query(
    "SELECT id FROM clients WHERE id = $1 AND user_id = $2",
    [clientId, userId]
  );
  return result.rows.length > 0;
}

// GET /api/tasks/team-members — list all TFO team members for assignment dropdowns
// Must be registered BEFORE /:id to avoid route collision
router.get("/team-members", async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email FROM users
       WHERE role IN ('advisor', 'admin')
       ORDER BY name ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /tasks/team-members error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks?client_id=xxx
router.get("/", async (req, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: "client_id query param required" });
  }

  try {
    if (!(await verifyClient(client_id as string, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const tasks = await query(
      `SELECT t.*, u.name AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.client_id = $1
       ORDER BY t.created_at DESC`,
      [client_id]
    );

    const results = await Promise.all(
      tasks.rows.map(async (t) => {
        const subtasks = await query(
          "SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order",
          [t.id]
        );
        return { ...t, subtasks: subtasks.rows };
      })
    );

    return res.json(results);
  } catch (err) {
    console.error("GET /tasks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks/advisor — all tasks across all clients (team members see all)
router.get("/advisor", async (req, res) => {
  const { status, priority, client_id } = req.query;
  const isTeamMember = req.user!.role !== "client";
  try {
    const result = isTeamMember
      ? await query(
          `SELECT t.*, c.name AS client_name, u.name AS assignee_name
           FROM tasks t
           JOIN clients c ON c.id = t.client_id
           LEFT JOIN users u ON u.id = t.assignee_id
           WHERE ($1::text IS NULL OR t.status = $1)
             AND ($2::text IS NULL OR t.priority = $2)
             AND ($3::uuid IS NULL OR t.client_id = $3::uuid)
           ORDER BY
             CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
             t.due_date ASC NULLS LAST,
             t.created_at DESC`,
          [
            (status as string) || null,
            (priority as string) || null,
            (client_id as string) || null,
          ]
        )
      : await query(
          `SELECT t.*, c.name AS client_name, u.name AS assignee_name
           FROM tasks t
           JOIN clients c ON c.id = t.client_id
           LEFT JOIN users u ON u.id = t.assignee_id
           WHERE c.advisor_id = $1
             AND ($2::text IS NULL OR t.status = $2)
             AND ($3::text IS NULL OR t.priority = $3)
             AND ($4::uuid IS NULL OR t.client_id = $4::uuid)
           ORDER BY
             CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
             t.due_date ASC NULLS LAST,
             t.created_at DESC`,
          [
            req.user!.id,
            (status as string) || null,
            (priority as string) || null,
            (client_id as string) || null,
          ]
        );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /tasks/advisor error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tasks
router.post("/", async (req, res) => {
  const { client_id, title, assignee_id, status, priority, due_date, phase, notes, subtasks } =
    req.body;

  if (!client_id || !title) {
    return res.status(400).json({ error: "client_id and title required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO tasks (client_id, title, assignee_id, status, priority, due_date, phase, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        client_id,
        title,
        assignee_id ?? null,
        status ?? "todo",
        priority ?? "medium",
        due_date ?? null,
        phase ?? null,
        notes ?? null,
      ]
    );
    const task = result.rows[0];

    // Fetch assignee name for response
    let assignee_name: string | null = null;
    if (task.assignee_id) {
      const uResult = await query("SELECT name FROM users WHERE id = $1", [task.assignee_id]);
      assignee_name = uResult.rows[0]?.name ?? null;
    }

    if (Array.isArray(subtasks) && subtasks.length > 0) {
      for (let i = 0; i < subtasks.length; i++) {
        await query(
          "INSERT INTO subtasks (task_id, title, done, sort_order) VALUES ($1, $2, $3, $4)",
          [task.id, subtasks[i].title, subtasks[i].done ?? false, i]
        );
      }
    }

    const subResult = await query(
      "SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order",
      [task.id]
    );

    return res.status(201).json({ ...task, assignee_name, subtasks: subResult.rows });
  } catch (err) {
    console.error("POST /tasks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req, res) => {
  try {
    const tResult = await query(
      `SELECT t.*, u.name AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (tResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = tResult.rows[0];

    if (!(await verifyClient(task.client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const subtasks = await query(
      "SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order",
      [task.id]
    );

    return res.json({ ...task, subtasks: subtasks.rows });
  } catch (err) {
    console.error("GET /tasks/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req, res) => {
  const { subtasks, ...rawFields } = req.body;
  const fields: Record<string, unknown> = {};
  for (const k of Object.keys(rawFields)) {
    if (ALLOWED_COLUMNS.has(k)) fields[k] = rawFields[k];
  }

  if (fields.status === "skipped" && !fields.skip_reason) {
    return res.status(400).json({ error: "skip_reason is required when status is skipped" });
  }

  const keys = Object.keys(fields);

  try {
    const tResult = await query("SELECT * FROM tasks WHERE id = $1", [req.params.id]);
    if (tResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (!(await verifyClient(tResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    let task = tResult.rows[0];

    if (keys.length > 0) {
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
      const values = keys.map((k) => fields[k]);
      const updated = await query(
        `UPDATE tasks SET ${setClauses.join(", ")}, updated_at = NOW()
         WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, req.params.id]
      );
      task = updated.rows[0];
    }

    if (Array.isArray(subtasks)) {
      await query("DELETE FROM subtasks WHERE task_id = $1", [req.params.id]);
      for (let i = 0; i < subtasks.length; i++) {
        await query(
          "INSERT INTO subtasks (task_id, title, done, sort_order) VALUES ($1, $2, $3, $4)",
          [req.params.id, subtasks[i].title, subtasks[i].done ?? false, i]
        );
      }
    }

    // Return with assignee name
    let assignee_name: string | null = null;
    if (task.assignee_id) {
      const uResult = await query("SELECT name FROM users WHERE id = $1", [task.assignee_id]);
      assignee_name = uResult.rows[0]?.name ?? null;
    }

    const subResult = await query(
      "SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order",
      [req.params.id]
    );

    return res.json({ ...task, assignee_name, subtasks: subResult.rows });
  } catch (err) {
    console.error("PATCH /tasks/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const tResult = await query("SELECT * FROM tasks WHERE id = $1", [req.params.id]);
    if (tResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (!(await verifyClient(tResult.rows[0].client_id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /tasks/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

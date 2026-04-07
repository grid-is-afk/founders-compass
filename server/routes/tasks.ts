import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const ALLOWED_COLUMNS = new Set([
  "title",
  "assignee",
  "status",
  "priority",
  "due_date",
  "phase",
]);

// Helper: verify client belongs to the requesting user (advisor or client-role)
async function verifyClient(clientId: string, userId: string, userRole: string) {
  const col = userRole === "client" ? "user_id" : "advisor_id";
  const result = await query(
    `SELECT id FROM clients WHERE id = $1 AND ${col} = $2`,
    [clientId, userId]
  );
  return result.rows.length > 0;
}

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
      "SELECT * FROM tasks WHERE client_id = $1 ORDER BY created_at DESC",
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

// POST /api/tasks
router.post("/", async (req, res) => {
  const { client_id, title, assignee, status, priority, due_date, phase, subtasks } =
    req.body;

  if (!client_id || !title) {
    return res.status(400).json({ error: "client_id and title required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO tasks (client_id, title, assignee, status, priority, due_date, phase)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        client_id,
        title,
        assignee ?? null,
        status ?? "todo",
        priority ?? "medium",
        due_date ?? null,
        phase ?? null,
      ]
    );
    const task = result.rows[0];

    // Insert subtasks if provided
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

    return res.status(201).json({ ...task, subtasks: subResult.rows });
  } catch (err) {
    console.error("POST /tasks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req, res) => {
  try {
    const tResult = await query("SELECT * FROM tasks WHERE id = $1", [
      req.params.id,
    ]);
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
  const keys = Object.keys(fields);

  try {
    const tResult = await query("SELECT * FROM tasks WHERE id = $1", [
      req.params.id,
    ]);
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

    // Update subtasks if provided
    if (Array.isArray(subtasks)) {
      await query("DELETE FROM subtasks WHERE task_id = $1", [req.params.id]);
      for (let i = 0; i < subtasks.length; i++) {
        await query(
          "INSERT INTO subtasks (task_id, title, done, sort_order) VALUES ($1, $2, $3, $4)",
          [req.params.id, subtasks[i].title, subtasks[i].done ?? false, i]
        );
      }
    }

    const subResult = await query(
      "SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order",
      [req.params.id]
    );

    return res.json({ ...task, subtasks: subResult.rows });
  } catch (err) {
    console.error("PATCH /tasks/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const tResult = await query("SELECT * FROM tasks WHERE id = $1", [
      req.params.id,
    ]);
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

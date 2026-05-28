import { Router } from "express";
import pool, { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";

const router = Router();

const ALLOWED_COLUMNS = new Set(["name", "role", "email", "notes", "tier", "current_sentiment"]);

const VALID_SENTIMENTS = new Set(["positive", "neutral", "negative", "at_risk"]);
const ADVISOR_SIGNAL_TYPES = new Set(["manual_note", "sentiment"]);

const verifyClient = verifyClientAccess;

// GET /api/stakeholders?client_id=xxx
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
      `SELECT * FROM stakeholders WHERE client_id = $1 ORDER BY tier ASC, name ASC`,
      [client_id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /stakeholders error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/stakeholders
router.post("/", async (req, res) => {
  const { client_id, name, role, email, notes, tier } = req.body;
  if (!client_id || !name) {
    return res.status(400).json({ error: "client_id and name required" });
  }

  try {
    if (!(await verifyClient(client_id, req.user!.id, req.user!.role))) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await query(
      `INSERT INTO stakeholders (client_id, name, role, email, notes, tier)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [client_id, name, role ?? null, email ?? null, notes ?? null, tier ?? "primary"]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /stakeholders error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/stakeholders/:id
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

  // Validate sentiment value when present
  if ("current_sentiment" in fields) {
    const sentimentVal = fields["current_sentiment"];
    if (sentimentVal !== null && sentimentVal !== undefined && !VALID_SENTIMENTS.has(sentimentVal as string)) {
      return res.status(400).json({ error: "Invalid sentiment value" });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT s.*, c.advisor_id, c.user_id FROM stakeholders s
       JOIN clients c ON c.id = s.client_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Stakeholder not found" });
    }
    const row = existing.rows[0];
    if (
      req.user!.role !== "admin" &&
      row.advisor_id !== req.user!.id &&
      row.user_id !== req.user!.id
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Access denied" });
    }

    const patchingSentiment =
      "current_sentiment" in fields &&
      fields["current_sentiment"] !== null &&
      fields["current_sentiment"] !== undefined;

    // When patching sentiment, also update sentiment_updated_at
    if (patchingSentiment) {
      fields["sentiment_updated_at"] = new Date().toISOString();
      keys.push("sentiment_updated_at");
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => fields[k]);

    const result = await client.query(
      `UPDATE stakeholders SET ${setClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    );

    // Write sentiment history row when current_sentiment is being set to a non-null value
    if (patchingSentiment) {
      await client.query(
        `INSERT INTO stakeholder_signals
           (stakeholder_id, client_id, signal_type, sentiment, value, created_by)
         VALUES ($1, $2, 'sentiment', $3, $4, $5)`,
        [
          req.params.id,
          row.client_id,
          fields["current_sentiment"],
          `Sentiment updated to ${fields["current_sentiment"]}`,
          req.user!.id,
        ]
      );
    }

    await client.query("COMMIT");
    return res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /stakeholders/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/stakeholders/:id
router.delete("/:id", async (req, res) => {
  try {
    const existing = await query(
      `SELECT s.*, c.advisor_id FROM stakeholders s
       JOIN clients c ON c.id = s.client_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Stakeholder not found" });
    }
    if (req.user!.role !== "admin" && existing.rows[0].advisor_id !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM stakeholders WHERE id = $1", [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /stakeholders/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/stakeholders/:id/signals?limit=50
router.get("/:id/signals", async (req, res) => {
  const rawLimit = parseInt((req.query.limit as string) ?? "50", 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 200);

  try {
    // Access check: join through stakeholders → clients (same pattern as PATCH)
    const existing = await query(
      `SELECT s.*, c.advisor_id, c.user_id FROM stakeholders s
       JOIN clients c ON c.id = s.client_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Stakeholder not found" });
    }
    const row = existing.rows[0];
    if (
      req.user!.role !== "admin" &&
      row.advisor_id !== req.user!.id &&
      row.user_id !== req.user!.id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await query(
      `SELECT * FROM stakeholder_signals
       WHERE stakeholder_id = $1
       ORDER BY ts DESC
       LIMIT $2`,
      [req.params.id, limit]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /stakeholders/:id/signals error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/stakeholders/:id/signals
router.post("/:id/signals", async (req, res) => {
  const { signal_type, value, sentiment } = req.body as {
    signal_type: unknown;
    value: unknown;
    sentiment: unknown;
  };

  // Validate signal_type — only advisor-direct types allowed here
  if (typeof signal_type !== "string" || !ADVISOR_SIGNAL_TYPES.has(signal_type)) {
    return res.status(400).json({
      error: "signal_type must be one of: manual_note, sentiment",
    });
  }

  // value is required and must be a non-empty string
  if (typeof value !== "string" || value.trim() === "") {
    return res.status(400).json({ error: "value is required and must be non-empty" });
  }

  // sentiment required (and valid) when signal_type === 'sentiment'
  if (signal_type === "sentiment") {
    if (typeof sentiment !== "string" || !VALID_SENTIMENTS.has(sentiment)) {
      return res.status(400).json({
        error: "sentiment is required for signal_type='sentiment' and must be one of: positive, neutral, negative, at_risk",
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Access check
    const existing = await client.query(
      `SELECT s.*, c.advisor_id, c.user_id FROM stakeholders s
       JOIN clients c ON c.id = s.client_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Stakeholder not found" });
    }
    const row = existing.rows[0];
    if (
      req.user!.role !== "admin" &&
      row.advisor_id !== req.user!.id &&
      row.user_id !== req.user!.id
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Access denied" });
    }

    const signalRes = await client.query(
      `INSERT INTO stakeholder_signals
         (stakeholder_id, client_id, signal_type, sentiment, value, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.params.id,
        row.client_id,
        signal_type,
        signal_type === "sentiment" ? sentiment : null,
        value.trim(),
        req.user!.id,
      ]
    );

    // When writing a sentiment signal, also update the snapshot on the stakeholder row
    if (signal_type === "sentiment") {
      await client.query(
        `UPDATE stakeholders
         SET current_sentiment = $1, sentiment_updated_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [sentiment, req.params.id]
      );
    }

    await client.query("COMMIT");
    return res.status(201).json(signalRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /stakeholders/:id/signals error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;

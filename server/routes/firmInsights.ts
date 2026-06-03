import { Router, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import pool, { query } from "../db.js";

// ============================================================
// UC-13 — Cross-engagement pattern recognition ("Firm Insights")
//
// A firm-wide analog of the per-client risk scan (server/routes/riskScan.ts):
// deterministic SQL aggregates across ALL non-archived engagements build a
// `metrics` snapshot; Claude then narrates patterns from those PRE-COMPUTED
// numbers only (it never sees raw rows and is told not to invent figures), so
// the numbers stay trustworthy and only the prose is AI-generated.
//
// TFO-only: every advisor + admin may view, run, and approve. The client role
// is blocked here (the spec: "TFO ONLY — no other advisor or client").
// ============================================================

const router = Router();

const CATEGORIES = ["working", "blocker", "strength", "weakness"] as const;
type Category = (typeof CATEGORIES)[number];

// Block the client role at the route layer — this is the real access gate
// (the sidebar item is already advisor-workspace-only). Returns false + sends
// 403 when the caller is a client, true otherwise.
function requireStaff(req: Request, res: Response): boolean {
  if (req.user!.role === "client") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

interface EngagementRow {
  id: string;
  name: string;
  stage: string | null;
  current_quarter: number;
  current_year: number;
  flagged: boolean;
  open_risks: number;
  critical_risks: number;
  overdue_tasks: number;
  last_meeting: string | null;
  confirmed_objectives: number;
  overdue_deliverables: number;
}

// Compute every firm-level metric in SQL. Returns a compact snapshot plus the
// per-engagement table Claude uses to spot patterns and cite specific ids.
async function computeFirmMetrics() {
  // Per-engagement summary — one row per active client. The richest signal:
  // lets Claude reference specific engagements by id, and the firm-wide
  // aggregates below are derived from the same source of truth.
  const engagementsResult = await query(
    `SELECT
        c.id,
        c.name,
        c.stage,
        c.current_quarter,
        c.current_year,
        (c.flagged_at IS NOT NULL) AS flagged,
        (SELECT COUNT(*) FROM risk_alerts r
           WHERE r.client_id = c.id AND r.resolved = false)::int AS open_risks,
        (SELECT COUNT(*) FROM risk_alerts r
           WHERE r.client_id = c.id AND r.resolved = false
             AND r.severity IN ('critical', 'high'))::int AS critical_risks,
        (SELECT COUNT(*) FROM tasks t
           WHERE t.client_id = c.id AND t.due_date < CURRENT_DATE
             AND t.status NOT IN ('done'))::int AS overdue_tasks,
        (SELECT MAX(date) FROM meetings m WHERE m.client_id = c.id) AS last_meeting,
        (SELECT COUNT(*) FROM quarterly_objectives qo
           WHERE qo.client_id = c.id AND qo.status = 'confirmed')::int AS confirmed_objectives,
        (SELECT COUNT(*) FROM deliverables d
           WHERE d.client_id = c.id AND d.archived_at IS NULL
             AND d.due_date < CURRENT_DATE
             AND d.status NOT IN ('complete', 'ready'))::int AS overdue_deliverables
     FROM clients c
     WHERE c.archived = false
     ORDER BY c.name`
  );
  const engagements = engagementsResult.rows as EngagementRow[];

  // Deliverable approval rate + latency (generated_at → approved_at).
  const deliverables = (
    await query(
      `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE review_status IN ('approved', 'client_approved') OR approved_at IS NOT NULL
          )::int AS approved,
          ROUND(AVG(EXTRACT(EPOCH FROM (approved_at - generated_at)) / 86400)
            FILTER (WHERE approved_at IS NOT NULL AND generated_at IS NOT NULL)::numeric, 1
          ) AS avg_approval_days
       FROM deliverables d
       JOIN clients c ON c.id = d.client_id
       WHERE c.archived = false AND d.archived_at IS NULL`
    )
  ).rows[0];

  // Objective confirmation rate + orphan (confirmed, 7d+ old, no supporting task).
  const objectives = (
    await query(
      `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE qo.status IN ('confirmed', 'achieved'))::int AS confirmed,
          COUNT(*) FILTER (WHERE qo.status = 'proposed')::int AS proposed
       FROM quarterly_objectives qo
       JOIN clients c ON c.id = qo.client_id
       WHERE c.archived = false`
    )
  ).rows[0];
  const orphanObjectives = Number(
    (
      await query(
        `SELECT COUNT(*)::int AS n FROM (
           SELECT qo.id
           FROM quarterly_objectives qo
           JOIN clients c ON c.id = qo.client_id
           LEFT JOIN tasks t ON t.objective_id = qo.id
           WHERE c.archived = false
             AND qo.status = 'confirmed'
             AND qo.created_at < NOW() - INTERVAL '7 days'
           GROUP BY qo.id
           HAVING COUNT(t.id) = 0
         ) z`
      )
    ).rows[0]?.n ?? 0
  );

  // Unresolved risk concentration by source_type — recurring blockers surface here.
  const risksByType = (
    await query(
      `SELECT COALESCE(r.source_type, 'other') AS source_type, COUNT(*)::int AS n
       FROM risk_alerts r
       JOIN clients c ON c.id = r.client_id
       WHERE c.archived = false AND r.resolved = false
       GROUP BY COALESCE(r.source_type, 'other')
       ORDER BY n DESC`
    )
  ).rows;

  // Scope creep: items created after the relevant quarter was locked.
  const scopeCreepTasks = Number(
    (
      await query(
        `SELECT COUNT(*)::int AS n
         FROM tasks t
         JOIN clients c ON c.id = t.client_id
         JOIN quarterly_plans qp
           ON qp.client_id = c.id AND qp.status = 'active' AND qp.locked_at IS NOT NULL
         WHERE c.archived = false
           AND t.objective_id IS NULL
           AND t.created_at > qp.locked_at
           AND t.status NOT IN ('done')`
      )
    ).rows[0]?.n ?? 0
  );
  const scopeCreepObjectives = Number(
    (
      await query(
        `SELECT COUNT(*)::int AS n
         FROM quarterly_objectives qo
         JOIN clients c ON c.id = qo.client_id
         JOIN quarterly_plans qp
           ON qp.client_id = qo.client_id AND qp.quarter = qo.quarter AND qp.year = qo.year
         WHERE c.archived = false
           AND qp.locked_at IS NOT NULL
           AND qo.created_at > qp.locked_at
           AND qo.status IN ('proposed', 'confirmed')`
      )
    ).rows[0]?.n ?? 0
  );

  // Grow-lane activation by capital type.
  const grow = (
    await query(
      `SELECT COALESCE(ge.capital_type, 'unspecified') AS capital_type,
              ge.status, COUNT(*)::int AS n
       FROM grow_engagements ge
       JOIN clients c ON c.id = ge.client_id
       WHERE c.archived = false
       GROUP BY COALESCE(ge.capital_type, 'unspecified'), ge.status
       ORDER BY capital_type`
    )
  ).rows;

  // Derive simple roll-ups in JS from the per-engagement table.
  const byStage: Record<string, number> = {};
  let staleMeetings = 0;
  const STALE_MS = 30 * 86400000;
  const now = Date.now();
  for (const e of engagements) {
    const stage = e.stage ?? "Unknown";
    byStage[stage] = (byStage[stage] ?? 0) + 1;
    if (!e.last_meeting || now - new Date(e.last_meeting).getTime() >= STALE_MS) {
      staleMeetings += 1;
    }
  }

  const totalDeliverables = Number(deliverables?.total ?? 0);
  const totalObjectives = Number(objectives?.total ?? 0);

  return {
    portfolio: {
      activeEngagements: engagements.length,
      byStage,
      flaggedEngagements: engagements.filter((e) => e.flagged).length,
    },
    deliverables: {
      total: totalDeliverables,
      approved: Number(deliverables?.approved ?? 0),
      approvedPct:
        totalDeliverables > 0
          ? Math.round((Number(deliverables.approved) / totalDeliverables) * 100)
          : 0,
      avgApprovalDays: deliverables?.avg_approval_days ?? null,
    },
    objectives: {
      total: totalObjectives,
      confirmed: Number(objectives?.confirmed ?? 0),
      proposed: Number(objectives?.proposed ?? 0),
      confirmedPct:
        totalObjectives > 0
          ? Math.round((Number(objectives.confirmed) / totalObjectives) * 100)
          : 0,
      orphans: orphanObjectives,
    },
    risks: {
      byType: risksByType,
      totalUnresolved: risksByType.reduce((sum, r) => sum + Number(r.n), 0),
    },
    scopeCreep: {
      tasksAfterLock: scopeCreepTasks,
      objectivesAfterLock: scopeCreepObjectives,
    },
    meetings: {
      staleEngagements: staleMeetings,
    },
    grow,
    engagements,
  };
}

type FirmMetrics = Awaited<ReturnType<typeof computeFirmMetrics>>;

interface DraftInsight {
  category: Category;
  title: string;
  narrative: string;
  engagements_referenced: string[];
}

// Ask Claude to narrate patterns from the pre-computed metrics. It is given the
// numbers + a list of engagements (id + name); it must not invent figures and
// must cite engagements by the ids provided. Returns sanitized drafts.
async function narrateInsights(metrics: FirmMetrics): Promise<DraftInsight[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const validIds = new Set(metrics.engagements.map((e) => e.id));

  const emitInsightsTool: Anthropic.Tool = {
    name: "emit_insights",
    description:
      "Return the firm-level insights you identified from the provided metrics.",
    input_schema: {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [...CATEGORIES],
                description:
                  "working = what's working; blocker = what consistently blocks progress; strength = where the methodology is strongest; weakness = where it's weakest.",
              },
              title: { type: "string", description: "Short headline (max ~10 words)." },
              narrative: {
                type: "string",
                description:
                  "2-4 sentences. Reference the actual numbers provided. Do not invent figures.",
              },
              engagements_referenced: {
                type: "array",
                items: { type: "string" },
                description:
                  "Engagement (client) ids from the provided list that this pattern is evidenced by. May be empty for firm-wide aggregates.",
              },
            },
            required: ["category", "title", "narrative", "engagements_referenced"],
          },
        },
      },
      required: ["insights"],
    },
  };

  const system =
    "You are the firm-level analyst for The Founders Office (TFO), a boutique exit-planning advisory. " +
    "You are given PRE-COMPUTED metrics aggregated across all active engagements. Your job is to surface " +
    "cross-engagement patterns in four buckets: what is working, what consistently blocks progress, where " +
    "the methodology produces the strongest results, and where it does not. " +
    "Rules: (1) Use ONLY the numbers provided — never invent or estimate figures. " +
    "(2) Cite specific engagements by the ids in the data when a pattern is driven by particular ones. " +
    "(3) Prefer patterns that span MULTIPLE engagements over one-offs. " +
    "(4) Be concise and decision-useful for firm leadership. " +
    "(5) Aim for 4-8 insights total, spread across the four categories where the data supports it. " +
    "Call the emit_insights tool with your findings.";

  const userMessage =
    "Here are the firm metrics (JSON). Engagement ids and names are in `engagements`.\n\n" +
    JSON.stringify(metrics, null, 2);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userMessage }],
    tools: [emitInsightsTool],
    tool_choice: { type: "tool", name: "emit_insights" },
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_insights"
  );
  if (!toolBlock) return [];

  const raw = (toolBlock.input as { insights?: unknown[] }).insights ?? [];

  // Sanitize: keep only valid categories, trim text, and drop any referenced id
  // that isn't a real active engagement (so the UI can always resolve names).
  const insights: DraftInsight[] = [];
  for (const item of raw) {
    const i = item as Record<string, unknown>;
    const category = i.category as Category;
    const title = typeof i.title === "string" ? i.title.trim() : "";
    const narrative = typeof i.narrative === "string" ? i.narrative.trim() : "";
    if (!CATEGORIES.includes(category) || !title || !narrative) continue;
    const refs = Array.isArray(i.engagements_referenced)
      ? (i.engagements_referenced as unknown[])
          .filter((id): id is string => typeof id === "string" && validIds.has(id))
      : [];
    insights.push({ category, title, narrative, engagements_referenced: refs });
  }
  return insights;
}

// ------------------------------------------------------------
// GET /api/firm-insights — list draft + approved (newest first), with the
// referenced engagements resolved to {id, name} for display.
// ------------------------------------------------------------
router.get("/", async (req, res) => {
  if (!requireStaff(req, res)) return;
  try {
    const result = await query(
      `SELECT id, category, title, narrative, engagements_referenced, status,
              generated_by, approved_by, approved_at, created_at
       FROM firm_insights
       WHERE status IN ('draft', 'approved')
       ORDER BY created_at DESC`
    );

    // Resolve engagement names once (small portfolio).
    const names = new Map<string, string>();
    const clientRows = await query(`SELECT id, name FROM clients`);
    for (const c of clientRows.rows as { id: string; name: string }[]) {
      names.set(c.id, c.name);
    }

    const insights = result.rows.map((row) => ({
      ...row,
      engagements: (row.engagements_referenced as string[]).map((id) => ({
        id,
        name: names.get(id) ?? "Unknown engagement",
      })),
    }));

    return res.json(insights);
  } catch (err) {
    console.error("GET /firm-insights error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------------------------------------------------
// GET /api/firm-insights/metrics — current firm-level metrics (no AI). Powers
// the headline summary strip on the page so it reflects live state, not a
// stored scan snapshot.
// ------------------------------------------------------------
router.get("/metrics", async (req, res) => {
  if (!requireStaff(req, res)) return;
  try {
    const metrics = await computeFirmMetrics();
    return res.json(metrics);
  } catch (err) {
    console.error("GET /firm-insights/metrics error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------------------------------------------------
// POST /api/firm-insights/scan — compute metrics, narrate with Claude, and
// atomically swap the DRAFT set. Approved/dismissed rows are preserved.
// ------------------------------------------------------------
router.post("/scan", async (req, res) => {
  if (!requireStaff(req, res)) return;
  try {
    const metrics = await computeFirmMetrics();

    // Nothing to analyze — clear stale drafts and report an empty result.
    if (metrics.portfolio.activeEngagements === 0) {
      await query(`DELETE FROM firm_insights WHERE status = 'draft'`);
      return res.json({ scanned: true, insights: 0, reason: "no_active_engagements" });
    }

    const drafts = await narrateInsights(metrics);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Replace only drafts — approved/dismissed decisions survive a re-scan.
      await client.query(`DELETE FROM firm_insights WHERE status = 'draft'`);
      for (const d of drafts) {
        await client.query(
          `INSERT INTO firm_insights
             (category, title, narrative, metrics, engagements_referenced, status, generated_by)
           VALUES ($1, $2, $3, $4, $5, 'draft', $6)`,
          [
            d.category,
            d.title,
            d.narrative,
            JSON.stringify(metrics),
            d.engagements_referenced,
            req.user!.id,
          ]
        );
      }
      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return res.json({ scanned: true, insights: drafts.length });
  } catch (err) {
    console.error("POST /firm-insights/scan error:", err);
    return res.status(500).json({ error: "Scan failed" });
  }
});

// ------------------------------------------------------------
// PATCH /api/firm-insights/:id — move an insight draft → approved | dismissed.
// ------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  if (!requireStaff(req, res)) return;
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  if (status !== "approved" && status !== "dismissed") {
    return res.status(400).json({ error: "status must be 'approved' or 'dismissed'" });
  }

  try {
    const result = await query(
      `UPDATE firm_insights
       SET status      = $1,
           approved_by = CASE WHEN $1 = 'approved' THEN $2 ELSE approved_by END,
           approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END
       WHERE id = $3
       RETURNING id, status, approved_by, approved_at`,
      [status, req.user!.id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Insight not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /firm-insights/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { verifyClientAccess } from "../lib/verifyClient.js";

// Mounted at /api/clients — provides the 4-pillar CEPA intake for a client.
const router = Router({ mergeParams: true });

type RiskTag = "on_track" | "partial" | "gap" | "na";
const TAG_VALUE: Record<RiskTag, number | null> = {
  on_track: 100,
  partial: 50,
  gap: 0,
  na: null, // excluded from the average
};
const PILLARS = ["entity", "ip", "capital", "exit"] as const;
type Pillar = (typeof PILLARS)[number];

interface IncomingResponse {
  pillar: Pillar;
  question_key: string;
  answer_value?: string | null;
  risk_tag?: RiskTag | null;
  notes?: string | null;
}

interface PillarScore {
  pct: number;
  band: "high" | "average" | "low";
}

/** Mean of answered (non-N/A) questions in a pillar → %, with a risk band. */
function scorePillar(tags: (RiskTag | null | undefined)[]): PillarScore {
  const values = tags
    .map((t) => (t ? TAG_VALUE[t] : null))
    .filter((v): v is number => v !== null);
  if (values.length === 0) return { pct: 0, band: "high" };
  const pct = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const band = pct < 34 ? "high" : pct < 67 ? "average" : "low";
  return { pct, band };
}

function computePillarScores(responses: IncomingResponse[]): Record<Pillar, PillarScore> {
  const out = {} as Record<Pillar, PillarScore>;
  for (const pillar of PILLARS) {
    const tags = responses.filter((r) => r.pillar === pillar).map((r) => r.risk_tag);
    out[pillar] = scorePillar(tags);
  }
  return out;
}

// GET /api/clients/:id/intake — latest intake + responses for a client
router.get("/:id/intake", async (req, res) => {
  try {
    if (!(await verifyClientAccess(req.params.id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Client not found or access denied" });
    }
    const intakeRes = await query(
      `SELECT * FROM licensee_intakes WHERE client_id = $1 ORDER BY version DESC LIMIT 1`,
      [req.params.id]
    );
    if (intakeRes.rows.length === 0) {
      return res.json({ intake: null, responses: [] });
    }
    const intake = intakeRes.rows[0];
    const responsesRes = await query(
      `SELECT pillar, question_key, answer_value, risk_tag, notes
       FROM licensee_intake_responses WHERE intake_id = $1`,
      [intake.id]
    );
    return res.json({ intake, responses: responsesRes.rows });
  } catch (err) {
    console.error("GET /clients/:id/intake error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/clients/:id/intake — create or update the intake (upsert v1 + responses)
router.put("/:id/intake", async (req, res) => {
  try {
    if (!(await verifyClientAccess(req.params.id, req.user!.id, req.user!.role))) {
      return res.status(403).json({ error: "Client not found or access denied" });
    }

    const {
      cepa_name,
      firm_name,
      completed_date,
      annual_revenue,
      num_owners,
      owner_ages,
      industry,
      exit_horizon,
      vam_phase,
      status = "in_progress",
      responses = [],
    } = req.body as {
      cepa_name?: string;
      firm_name?: string;
      completed_date?: string;
      annual_revenue?: string;
      num_owners?: number;
      owner_ages?: string;
      industry?: string;
      exit_horizon?: string;
      vam_phase?: string;
      status?: "in_progress" | "complete";
      responses?: IncomingResponse[];
    };

    if (!["in_progress", "complete"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const validResponses = responses.filter(
      (r) => r && PILLARS.includes(r.pillar) && typeof r.question_key === "string"
    );

    const pillarScores = computePillarScores(validResponses);
    const completedAt = status === "complete" ? new Date().toISOString() : null;

    // Upsert intake v1 (one intake per client in the thin slice)
    const upsert = await query(
      `INSERT INTO licensee_intakes
         (client_id, version, status, cepa_name, firm_name, completed_date, annual_revenue,
          num_owners, owner_ages, industry, exit_horizon, vam_phase, pillar_scores, completed_at)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (client_id, version) DO UPDATE SET
         status         = EXCLUDED.status,
         cepa_name      = EXCLUDED.cepa_name,
         firm_name      = EXCLUDED.firm_name,
         completed_date = EXCLUDED.completed_date,
         annual_revenue = EXCLUDED.annual_revenue,
         num_owners     = EXCLUDED.num_owners,
         owner_ages     = EXCLUDED.owner_ages,
         industry       = EXCLUDED.industry,
         exit_horizon   = EXCLUDED.exit_horizon,
         vam_phase      = EXCLUDED.vam_phase,
         pillar_scores  = EXCLUDED.pillar_scores,
         completed_at   = COALESCE(licensee_intakes.completed_at, EXCLUDED.completed_at),
         updated_at     = NOW()
       RETURNING *`,
      [
        req.params.id,
        status,
        cepa_name ?? null,
        firm_name ?? null,
        completed_date ?? null,
        annual_revenue ?? null,
        num_owners ?? null,
        owner_ages ?? null,
        industry ?? null,
        exit_horizon ?? null,
        vam_phase ?? null,
        JSON.stringify(pillarScores),
        completedAt,
      ]
    );
    const intake = upsert.rows[0];

    // Replace responses
    await query(`DELETE FROM licensee_intake_responses WHERE intake_id = $1`, [intake.id]);
    for (const r of validResponses) {
      await query(
        `INSERT INTO licensee_intake_responses
           (intake_id, pillar, question_key, answer_value, risk_tag, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (intake_id, question_key) DO NOTHING`,
        [intake.id, r.pillar, r.question_key, r.answer_value ?? null, r.risk_tag ?? null, r.notes ?? null]
      );
    }

    // Mirror status onto the client's stage for the list view
    await query(
      `UPDATE clients SET stage = $1, updated_at = NOW() WHERE id = $2`,
      [status === "complete" ? "Assessment Complete" : "Assessment In Progress", req.params.id]
    );

    return res.json({ intake, responses: validResponses });
  } catch (err) {
    console.error("PUT /clients/:id/intake error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { query } from "./db.js";

/**
 * Read-only, single-client system prompt for the LICENSEE (Advisor) portal's
 * Quarterback AI.
 *
 * Deliberately does NOT use buildSystemPrompt / buildPlatformContext / firm
 * learnings / TFO proprietary methodology — those would leak TFO-internal IP and
 * other tenants' data to a licensee. The model is grounded ONLY in the one client
 * passed in (already ownership-verified upstream by verifyClientAccess), and is
 * given zero tools by the caller, so it can answer but never act.
 */

const PILLAR_LABEL: Record<string, string> = {
  entity: "Entity Structure",
  ip: "IP Protection",
  capital: "Capital Readiness",
  exit: "Exit Readiness",
};

const TAG_LABEL: Record<string, string> = {
  gap: "Gap",
  partial: "Partial",
  on_track: "On track",
  na: "N/A",
};

const BAND_LABEL: Record<string, string> = {
  high: "High risk",
  average: "Average risk",
  low: "Low risk",
};

interface PillarScore { pct: number; band: string }

export async function buildLicenseeClientContext(clientId: string): Promise<string> {
  const clientRes = await query(
    `SELECT name, contact_name, revenue, stage FROM clients WHERE id = $1`,
    [clientId]
  );
  const client = clientRes.rows[0];
  if (!client) return "";

  const intakeRes = await query(
    `SELECT * FROM licensee_intakes WHERE client_id = $1 ORDER BY version DESC LIMIT 1`,
    [clientId]
  );
  const intake = intakeRes.rows[0] ?? null;

  const lines: string[] = [];
  lines.push("## CLIENT (the only client you may discuss)");
  lines.push(`Business: ${client.name}`);
  if (client.contact_name) lines.push(`Owner / founder: ${client.contact_name}`);
  if (client.revenue) lines.push(`Annual revenue: ${client.revenue}`);
  lines.push(`Status: ${client.stage ?? "Intake Pending"}`);

  if (!intake) {
    lines.push("\nThis client has NOT completed the 4-pillar exit-readiness intake yet. Encourage the advisor to run the intake to unlock readiness scores and priorities.");
    return lines.join("\n");
  }

  // Engagement snapshot
  const snap: string[] = [];
  if (intake.industry) snap.push(`industry ${intake.industry}`);
  if (intake.num_owners != null) snap.push(`${intake.num_owners} owner(s)`);
  if (intake.owner_ages) snap.push(`ages ${intake.owner_ages}`);
  if (intake.exit_horizon) snap.push(`exit horizon ${intake.exit_horizon}`);
  if (intake.vam_phase) snap.push(`VAM phase ${intake.vam_phase}`);
  if (snap.length) lines.push(`Engagement snapshot: ${snap.join(", ")}.`);

  // Pillar scores
  const scores = (intake.pillar_scores ?? {}) as Record<string, PillarScore>;
  lines.push("\n## READINESS SCORES (4 pillars)");
  for (const key of ["entity", "ip", "capital", "exit"]) {
    const s = scores[key];
    if (s) lines.push(`- ${PILLAR_LABEL[key]}: ${s.pct}% (${BAND_LABEL[s.band] ?? s.band})`);
  }

  // Flagged gaps / partials
  const flaggedRes = await query(
    `SELECT pillar, answer_value, risk_tag
     FROM licensee_intake_responses
     WHERE intake_id = $1 AND risk_tag IN ('gap', 'partial')
     ORDER BY CASE risk_tag WHEN 'gap' THEN 0 ELSE 1 END`,
    [intake.id]
  );
  if (flaggedRes.rows.length > 0) {
    lines.push("\n## FLAGGED ITEMS (intake gaps & partials — these are the priorities)");
    for (const r of flaggedRes.rows) {
      lines.push(`- [${TAG_LABEL[r.risk_tag] ?? r.risk_tag}] ${PILLAR_LABEL[r.pillar] ?? r.pillar}: ${r.answer_value ?? ""}`);
    }
  }

  // Open tasks
  const tasksRes = await query(
    `SELECT title, status, priority FROM tasks WHERE client_id = $1 AND status <> 'done' ORDER BY created_at DESC LIMIT 25`,
    [clientId]
  );
  if (tasksRes.rows.length > 0) {
    lines.push("\n## OPEN ACTIONS");
    for (const t of tasksRes.rows) lines.push(`- ${t.title} (${t.status}, ${t.priority})`);
  }

  // Referrals
  const refRes = await query(
    `SELECT rr.status, rr.pillar, rp.name AS partner_name
     FROM referral_requests rr LEFT JOIN referral_partners rp ON rp.id = rr.partner_id
     WHERE rr.client_id = $1 ORDER BY rr.requested_at DESC LIMIT 25`,
    [clientId]
  );
  if (refRes.rows.length > 0) {
    lines.push("\n## REFERRAL REQUESTS");
    for (const r of refRes.rows) {
      lines.push(`- ${r.partner_name ?? (r.pillar ? PILLAR_LABEL[r.pillar] : "Specialist")} — ${String(r.status).replace("_", " ")}`);
    }
  }

  return lines.join("\n");
}

export async function buildLicenseeSystemPrompt(clientId: string): Promise<string> {
  const clientContext = await buildLicenseeClientContext(clientId);

  return [
    "You are the Quarterback AI assistant inside The Founders Office Advisor Portal.",
    "You support an Advisor — a certified exit-planning advisor (CEPA) — by helping them interpret ONE client's exit-readiness assessment and decide what to do next.",
    "",
    "## WHAT YOU DO",
    "- Explain the client's 4-pillar readiness scores (Entity Structure, IP Protection, Capital Readiness, Exit Readiness) and what the flagged Gap/Partial items mean.",
    "- Recommend, in plain language, what the advisor should prioritize first and why, grounded in this client's specific answers.",
    "- Offer general, widely-accepted exit-planning best practices (entity structuring, buy-sell agreements, IP assignment, valuation, EBITDA recasting, owner-dependence, customer concentration, etc.).",
    "",
    "## HARD RULES (scope)",
    "- You may ONLY discuss the single client described below. You have no knowledge of any other client, the advisor's wider book of business, or The Founders Office's internal portfolio, firm strategies, or proprietary methodology — and you must never claim to.",
    "- If asked about other clients, firm-wide data, TFO internals, or anything outside this client, briefly say you can only help with the currently selected client.",
    "- You are READ-ONLY: you cannot create tasks, send referrals, generate documents, or change anything. If asked to perform an action, explain the steps the advisor can take in the portal instead.",
    "- Be concise and practical. When you cite a gap, tie it to the concrete next step.",
    "",
    clientContext,
  ].join("\n");
}

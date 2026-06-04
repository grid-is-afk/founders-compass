/**
 * Canonical CEPA 4-pillar intake — 25 questions, transcribed verbatim from
 * `Reference/Licensee Portal/CEPA-Intake-Funnel.docx`.
 *
 * Each answer option carries a risk tag. Counting Gap/Partial answers per pillar
 * drives the readiness % and the TFO back-office scoping recommendation, exactly
 * as shown in `Angela Test Intake Questionnaire.pdf`.
 */

export type RiskTag = "on_track" | "partial" | "gap" | "na";

export type PillarKey = "entity" | "ip" | "capital" | "exit";

export interface IntakeOption {
  label: string;
  tag: RiskTag;
}

export interface IntakeQuestion {
  key: string;
  pillar: PillarKey;
  prompt: string;
  helper: string;
  options: IntakeOption[];
}

export interface PillarMeta {
  key: PillarKey;
  label: string;
  blurb: string;
}

export const PILLARS: PillarMeta[] = [
  { key: "entity", label: "Entity Structure", blurb: "Corporate documentation, governance, ownership alignment, and the legal scaffolding that determines whether the business is transferable." },
  { key: "ip", label: "IP Protection", blurb: "Intellectual property — registered and unregistered — is a major intangible value driver and a frequent due-diligence flashpoint." },
  { key: "capital", label: "Capital Readiness", blurb: "Clean numbers, defensible EBITDA, calibrated wealth gap, and the documentation a buyer or lender will require." },
  { key: "exit", label: "Exit Readiness", blurb: "The owner's, team's, and operation's preparedness to actually transition the business." },
];

export const PILLAR_LABEL: Record<PillarKey, string> = {
  entity: "Entity Structure",
  ip: "IP Protection",
  capital: "Capital Readiness",
  exit: "Exit Readiness",
};

export const RISK_TAG_LABEL: Record<RiskTag, string> = {
  on_track: "On track",
  partial: "Partial",
  gap: "Gap",
  na: "N/A",
};

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  // ── Pillar 1: Entity Structure ──────────────────────────────────────────
  {
    key: "entity_type",
    pillar: "entity",
    prompt: "Is the entity type (LLC, S-Corp, C-Corp, partnership) deliberately chosen to support the owner's preferred exit?",
    helper: "A mismatched entity can cost the owner double-digit percentages of net proceeds.",
    options: [
      { label: "Yes — entity was chosen with this exit in mind", tag: "on_track" },
      { label: "Probably fine, but never formally evaluated against exit options", tag: "partial" },
      { label: "No — current structure is sub-optimal for the preferred exit", tag: "gap" },
      { label: "Unknown — needs review", tag: "gap" },
    ],
  },
  {
    key: "corporate_docs",
    pillar: "entity",
    prompt: "What is the state of the corporate documents — formation docs, operating/shareholder agreement, bylaws, minute book?",
    helper: "Missing or outdated documents are a top exit-readiness deal killer.",
    options: [
      { label: "Complete, current, and signed within the last 2 years", tag: "on_track" },
      { label: "Exist but haven't been updated in 3+ years", tag: "partial" },
      { label: "Incomplete or missing key documents", tag: "gap" },
      { label: "Don't know what we have", tag: "gap" },
    ],
  },
  {
    key: "buy_sell",
    pillar: "entity",
    prompt: "Status of the buy-sell agreement?",
    helper: "Dated or unfunded buy-sells appear on EPI's Common Readiness Issues list.",
    options: [
      { label: "Current, funded, and addresses all 5 D's (death, disability, departure, divorce, dispute)", tag: "on_track" },
      { label: "Exists but is more than 3 years old, or not properly funded", tag: "partial" },
      { label: "Only a basic version — significant gaps", tag: "partial" },
      { label: "No buy-sell in place", tag: "gap" },
      { label: "Single owner — N/A", tag: "na" },
    ],
  },
  {
    key: "owner_alignment",
    pillar: "entity",
    prompt: "Are all shareholders / partners aligned on exit timing, deal structure, and post-exit involvement?",
    helper: "Partner misalignment kills more deals than valuation does.",
    options: [
      { label: "Fully aligned and on the same page", tag: "on_track" },
      { label: "Mostly aligned with some open issues", tag: "partial" },
      { label: "Significant misalignment among owners", tag: "gap" },
      { label: "Topic has never been discussed", tag: "gap" },
      { label: "Single owner — N/A", tag: "na" },
    ],
  },
  {
    key: "cap_table",
    pillar: "entity",
    prompt: "Is the cap table clean — no undocumented promises, phantom equity, options without strike prices, or unresolved claims?",
    helper: "Capture any handshake equity or stay-bonus arrangements in the notes.",
    options: [
      { label: "Clean and fully documented", tag: "on_track" },
      { label: "Mostly clean — minor cleanup needed", tag: "partial" },
      { label: "Phantom equity or undocumented promises exist", tag: "gap" },
      { label: "Single owner — N/A", tag: "na" },
    ],
  },
  {
    key: "real_estate",
    pillar: "entity",
    prompt: "If real estate is owned by or used by the business, how is it held?",
    helper: "Real estate tangled with the operating entity often complicates third-party sales.",
    options: [
      { label: "Held in a separate entity, on a market-rate lease to the business", tag: "on_track" },
      { label: "Held by operating entity, but a written lease exists", tag: "partial" },
      { label: "Tangled with the operating entity — no clean separation", tag: "gap" },
      { label: "No real estate involved — N/A", tag: "na" },
    ],
  },

  // ── Pillar 2: IP Protection ─────────────────────────────────────────────
  {
    key: "trademarks",
    pillar: "ip",
    prompt: "Status of trademarks and brand assets?",
    helper: "Personal-name IP ownership is one of the most common diligence findings.",
    options: [
      { label: "All registered with USPTO, current, owned by the entity", tag: "on_track" },
      { label: "Some registered, some pending, expired, or unregistered", tag: "partial" },
      { label: "Not registered, or owned personally by the founder", tag: "gap" },
      { label: "No trademarks to protect — N/A", tag: "na" },
    ],
  },
  {
    key: "patents_copyrights",
    pillar: "ip",
    prompt: "Status of patents and copyrights?",
    helper: "Include design patents, software copyrights, and pending applications.",
    options: [
      { label: "All documented, assigned to the entity, current on maintenance fees", tag: "on_track" },
      { label: "Some documented; gaps in assignment or fee payment", tag: "partial" },
      { label: "Patents/copyrights exist but are poorly documented", tag: "gap" },
      { label: "No patents or copyrights — N/A", tag: "na" },
    ],
  },
  {
    key: "nda_ip_assignment",
    pillar: "ip",
    prompt: "NDA and IP-assignment coverage of employees and contractors?",
    helper: "Especially important when IP lives in 'tribal knowledge' of key employees.",
    options: [
      { label: "Every employee and contractor has signed both", tag: "on_track" },
      { label: "Most have them — gaps for older staff or part-time/contract workers", tag: "partial" },
      { label: "Few or no agreements in place", tag: "gap" },
    ],
  },
  {
    key: "digital_assets",
    pillar: "ip",
    prompt: "Ownership of digital assets (domains, social handles, code repos, cloud accounts)?",
    helper: "Common gap: domains registered to a former marketing vendor.",
    options: [
      { label: "All owned by the entity in business-controlled accounts", tag: "on_track" },
      { label: "Most owned by the entity; some in personal accounts", tag: "partial" },
      { label: "Many sit in personal or third-party vendor accounts", tag: "gap" },
    ],
  },
  {
    key: "ip_register",
    pillar: "ip",
    prompt: "Is there a documented IP register and a monitoring/enforcement program?",
    helper: "Flag this if there's no central inventory of registered IP.",
    options: [
      { label: "Documented register plus an active monitoring/enforcement program", tag: "on_track" },
      { label: "Informal list, no monitoring", tag: "partial" },
      { label: "No register or monitoring", tag: "gap" },
    ],
  },

  // ── Pillar 3: Capital Readiness ─────────────────────────────────────────
  {
    key: "valuation",
    pillar: "capital",
    prompt: "When was the last third-party business valuation?",
    helper: "Outdated or owner-estimated values are a top three readiness issue.",
    options: [
      { label: "Within the last 12 months by an independent third party", tag: "on_track" },
      { label: "1–3 years ago", tag: "partial" },
      { label: "Over 3 years old, or owner-estimated only", tag: "gap" },
      { label: "Never had a formal valuation", tag: "gap" },
    ],
  },
  {
    key: "ebitda",
    pillar: "capital",
    prompt: "State of Recasted EBITDA / add-back schedule?",
    helper: "Excessive or undocumented add-backs are a major deal-killer in diligence.",
    options: [
      { label: "Documented per EPI standards with clean, defensible add-backs", tag: "on_track" },
      { label: "Calculated but add-backs aren't well documented", tag: "partial" },
      { label: "Never recasted — using book EBITDA only", tag: "gap" },
    ],
  },
  {
    key: "financial_statements",
    pillar: "capital",
    prompt: "Quality of financial statements?",
    helper: "Cash-basis or untouched-by-CPA financials cap the valuation multiple.",
    options: [
      { label: "Audited or reviewed by CPA, accrual basis, monthly close", tag: "on_track" },
      { label: "Compiled by CPA, accrual basis", tag: "partial" },
      { label: "Cash basis or owner-prepared", tag: "gap" },
    ],
  },
  {
    key: "wealth_gap",
    pillar: "capital",
    prompt: "Status of the owner's Wealth Gap calculation?",
    helper: "Wealth Gap drives every downstream decision — timing, structure, value-enhancement scope.",
    options: [
      { label: "Calculated and integrated with the personal financial plan", tag: "on_track" },
      { label: "Roughly estimated, not integrated", tag: "partial" },
      { label: "Never calculated", tag: "gap" },
    ],
  },
  {
    key: "net_proceeds",
    pillar: "capital",
    prompt: "Has a net-proceeds (after-tax) analysis been completed for each plausible exit option?",
    helper: "What the owner keeps matters more than headline price.",
    options: [
      { label: "Completed for all relevant exit options", tag: "on_track" },
      { label: "Completed for 1–2 exit options only", tag: "partial" },
      { label: "Never modeled", tag: "gap" },
    ],
  },
  {
    key: "bankable",
    pillar: "capital",
    prompt: "Is the business bankable today — clean balance sheet, adequate working capital, no off-balance-sheet liabilities?",
    helper: "Includes earn-outs from prior deals and personal guarantees.",
    options: [
      { label: "Bankable today — no material issues", tag: "on_track" },
      { label: "Mostly clean — some covenant or working capital concerns", tag: "partial" },
      { label: "Significant balance-sheet or off-balance-sheet issues", tag: "gap" },
    ],
  },
  {
    key: "forecast",
    pillar: "capital",
    prompt: "Is there a documented 3-year financial forecast tied to a written strategic plan?",
    helper: "Forecast credibility is on EPI's 22 Exit Readiness factors.",
    options: [
      { label: "3-year forecast tied to written strategic plan, updated quarterly", tag: "on_track" },
      { label: "Annual budget only", tag: "partial" },
      { label: "No forecast or budget", tag: "gap" },
    ],
  },

  // ── Pillar 4: Exit Readiness ────────────────────────────────────────────
  {
    key: "transition_plan",
    pillar: "exit",
    prompt: "Status of the owner's personal transition plan (life-after-business)?",
    helper: "75% of owners regret selling within 12 months — driven by lack of personal planning.",
    options: [
      { label: "Written plan including S.T.E.P. (Spiritual/Things/Experiences/People) reflection", tag: "on_track" },
      { label: "Some conversations started but nothing written", tag: "partial" },
      { label: "No personal transition planning", tag: "gap" },
    ],
  },
  {
    key: "advisory_team",
    pillar: "exit",
    prompt: "Is the full advisory team in place (CEPA, M&A attorney, estate attorney, CPA/tax, wealth advisor, banker/IB, insurance)?",
    helper: "Gaps here are the single most common back-office task TFO picks up.",
    options: [
      { label: "All key advisors in place and on a regular cadence", tag: "on_track" },
      { label: "Most in place; some gaps or coordination issues", tag: "partial" },
      { label: "Significant gaps in the advisor team", tag: "gap" },
    ],
  },
  {
    key: "contingency_plan",
    pillar: "exit",
    prompt: "Personal contingency plan — buy-sell funding, key-person insurance, disability coverage, written instructions?",
    helper: "EPI flags dated contingency plans as a top personal readiness issue.",
    options: [
      { label: "Current plan, funded buy-sell, insurance reviewed in last 12 months", tag: "on_track" },
      { label: "Plan exists but is dated or only partially funded", tag: "partial" },
      { label: "No current contingency plan", tag: "gap" },
    ],
  },
  {
    key: "owner_dependence",
    pillar: "exit",
    prompt: "How long could the business run without the owner?",
    helper: "Owner dependence is the #1 deal killer.",
    options: [
      { label: "90+ days — strong management bench with no gaps", tag: "on_track" },
      { label: "30–90 days — some key-person dependencies", tag: "partial" },
      { label: "Owner-dependent — business stops without the owner", tag: "gap" },
    ],
  },
  {
    key: "customer_concentration",
    pillar: "exit",
    prompt: "Customer concentration?",
    helper: "Concentration above thresholds compresses multiple by 1.0–2.0x.",
    options: [
      { label: "Top 5 under 25% / top 1 under 10%, with multi-year contracts", tag: "on_track" },
      { label: "Top 5 at 25–50% or top 1 over 10%", tag: "partial" },
      { label: "Top 5 over 50% or top 1 over 30%", tag: "gap" },
    ],
  },
  {
    key: "exit_options_analysis",
    pillar: "exit",
    prompt: "Have exit options been formally analyzed (pros/cons + scoring across 3rd-party, PE, ESOP, family, MBO, recap)?",
    helper: "Score 3 or below per option in EPI's Common Sense scoring = flagged.",
    options: [
      { label: "Formal analysis completed across all six options", tag: "on_track" },
      { label: "Options discussed informally but no formal scoring", tag: "partial" },
      { label: "Never formally analyzed", tag: "gap" },
    ],
  },
  {
    key: "operational_docs",
    pillar: "exit",
    prompt: "Operational documentation — SOPs, CRM, ERP, HR systems — and transferability?",
    helper: "Documentation gaps are easy for diligence to surface and they lower the offered multiple.",
    options: [
      { label: "SOPs and systems documented; processes transferable", tag: "on_track" },
      { label: "Some documentation; key processes still in tribal knowledge", tag: "partial" },
      { label: "Little to no documentation", tag: "gap" },
    ],
  },
];

export const QUESTIONS_BY_PILLAR: Record<PillarKey, IntakeQuestion[]> = {
  entity: INTAKE_QUESTIONS.filter((q) => q.pillar === "entity"),
  ip: INTAKE_QUESTIONS.filter((q) => q.pillar === "ip"),
  capital: INTAKE_QUESTIONS.filter((q) => q.pillar === "capital"),
  exit: INTAKE_QUESTIONS.filter((q) => q.pillar === "exit"),
};

export type RiskBand = "high" | "average" | "low";

/**
 * Readiness band from a pillar %. Thresholds calibrated against the Angela test
 * output (Entity 25% / IP 33% = High, Capital 36% = Average, Exit 21% = High).
 */
export function riskBand(pct: number): RiskBand {
  if (pct < 34) return "high";
  if (pct < 67) return "average";
  return "low";
}

export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  high: "High risk",
  average: "Average risk",
  low: "Low risk",
};

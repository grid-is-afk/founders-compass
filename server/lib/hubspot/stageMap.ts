// ============================================================
// HubSpot deal stage → platform prospect status mapping.
//
// The board keeps its 4 columns (Intake → Fit Assessment → Discovery → Win/Pass);
// each HubSpot stage maps INTO one of those columns. We map by the human stage
// LABEL (not the opaque stage id) so the mapping stays readable and survives a
// HubSpot stage-id change. TFO can tweak the table here in one place.
//
// Confirmed "Sales pipeline" stages:
//   New - Fit Gate Qualified → Intro Call Scheduled/Completed →
//   Follow-up (Sales) Scheduled/Completed → Proposal/Quotation Sent →
//   Payment Received → Kick-Off Call Scheduled → Won - Servicing →
//   Closed - Serviced → Closed - Lost
// The second "Event Follow-ups" pipeline maps to the off-pipeline nurture buckets.
// ============================================================

import type { HubSpotPipeline } from "./client.js";

export type ProspectStatus =
  | "intake"
  | "fit_assessment"
  | "discovery_scheduled"
  | "discovery_complete"
  | "fit"
  | "onboarding"
  | "not_fit"
  | "nurture_call"
  | "kept_in_loop"
  | "flagged_follow_up";

/** Normalize a label for matching: lowercase, collapse punctuation/whitespace. */
function norm(label: string): string {
  return label
    .toLowerCase()
    .replace(/[–—]/g, "-") // unify en/em dashes
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Exact-label → status. Keys are normalized labels.
const LABEL_MAP: Record<string, ProspectStatus> = {
  // Sales pipeline
  "new fit gate qualified": "intake",
  "intro call scheduled": "fit_assessment",
  "intro call completed": "fit_assessment",
  "follow up sales scheduled": "discovery_scheduled",
  "follow up sales completed": "discovery_complete",
  "proposal quotation sent": "discovery_complete",
  "payment received": "fit",
  "kick off call scheduled": "onboarding",
  "won servicing": "onboarding",
  "closed serviced": "onboarding",
  "closed lost": "not_fit",
  // Event Follow-ups pipeline (nurture)
  new: "kept_in_loop",
  "reached out": "nurture_call",
  "nurturing scheduled": "nurture_call",
  "hand off to sales": "fit_assessment",
  "closed not a fit sent": "not_fit",
  "closed relationship won": "onboarding",
  "closed task completed": "kept_in_loop",
};

/**
 * Keyword fallback for any stage label we don't have an exact entry for, so an
 * unmapped or renamed HubSpot stage still lands in a sensible column instead of
 * silently dropping. Order matters — most specific first.
 */
function fallbackFromKeywords(n: string): ProspectStatus {
  if (/(won|servic|kick off|payment|closed serviced)/.test(n)) return "onboarding";
  if (/(lost|not a fit|disqualif)/.test(n)) return "not_fit";
  if (/(proposal|quotation|follow up)/.test(n)) return "discovery_complete";
  if (/(discovery|demo)/.test(n)) return "discovery_scheduled";
  if (/(intro|qualif|assessment|fit)/.test(n)) return "fit_assessment";
  if (/(nurtur|reached out)/.test(n)) return "nurture_call";
  return "intake";
}

export function mapLabelToStatus(label: string): ProspectStatus {
  const n = norm(label);
  return LABEL_MAP[n] ?? fallbackFromKeywords(n);
}

/**
 * Whether a deal pipeline represents prospects we want mirrored. TFO runs several
 * pipelines (Sales, Event Follow-ups, Referrals) plus payout/billing pipelines
 * ("Affiliate Payouts", "Referrals Payout") that are NOT prospects. We exclude
 * the billing ones by label keyword so renaming/new pipelines stay covered.
 */
export function isSyncedPipeline(label: string): boolean {
  return !/payout|affiliate/i.test(label);
}

/**
 * Build a lookup from HubSpot stage id → { status, label } across the prospect
 * pipelines (payout/billing pipelines excluded), so a deal's `dealstage` (an
 * opaque id) resolves to our status plus the human label we surface on the card.
 * A deal whose stage isn't in this map (e.g. a billing deal) is skipped by sync.
 */
export function buildStageIdMap(
  pipelines: HubSpotPipeline[]
): Record<string, { status: ProspectStatus; label: string }> {
  const map: Record<string, { status: ProspectStatus; label: string }> = {};
  for (const pipeline of pipelines) {
    if (!isSyncedPipeline(pipeline.label)) continue;
    for (const stage of pipeline.stages) {
      map[stage.id] = { status: mapLabelToStatus(stage.label), label: stage.label };
    }
  }
  return map;
}

/** "Won"-type stages: the deal is effectively a client in HubSpot. */
export function isWonLabel(label: string): boolean {
  return /(won|servic|kick off|payment)/.test(norm(label));
}

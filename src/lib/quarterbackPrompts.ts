import {
  EXPOSURE_CATEGORIES,
  exposureLevel,
  type CategoryId,
} from "@/lib/exposureIndexQuestions";
import { SIX_CS, MAX_SIX_CS_SCORE } from "@/components/prospects/SixCsModal";
import type { ClientSixCsBaselineResult } from "@/hooks/useClientSixCsBaseline";
import type { ClientExposureIndexRecord } from "@/hooks/useClientExposureIndex";
import type { ClientFounderMatrixRecord } from "@/hooks/useClientFounderMatrix";
import type { ClientFounderSnapshotRecord } from "@/hooks/useClientFounderSnapshot";
import type { ClientOptionalityFrameworkRecord } from "@/hooks/useClientOptionalityFramework";
import { SNAPSHOT_DIMENSIONS } from "@/components/clients/FounderSnapshotModal";
import { OPTIONALITY_CONDITIONS } from "@/components/clients/FounderOptionalityModal";

export function buildExposureIndexPrompt(
  prospectName: string,
  scores: Record<string, number>
): string {
  const parts = EXPOSURE_CATEGORIES.map(
    (cat) =>
      `${cat.label}: ${scores[cat.id as CategoryId] ?? 0}/9 (${exposureLevel(scores[cat.id as CategoryId] ?? 0)} exposure)`
  ).join(", ");
  return (
    `Summarize the Founder Exposure Index results for ${prospectName}. ` +
    `Their scores: ${parts}. ` +
    `What are their top 2–3 risk areas and what should we prioritize first?`
  );
}

// ---------------------------------------------------------------------------
// Client context prompt builder
// ---------------------------------------------------------------------------

interface ClientContextData {
  clientName: string;
  sixCsBaseline?: ClientSixCsBaselineResult | null;
  exposureIndex?: ClientExposureIndexRecord | null;
  founderMatrix?: ClientFounderMatrixRecord | null;
  founderSnapshot?: ClientFounderSnapshotRecord | null;
  optionalityFramework?: ClientOptionalityFrameworkRecord | null;
}

/**
 * Build a Quarterback prompt with all available client assessment context.
 * Flags urgent Snapshot dimensions and failed Optionality conditions.
 */
export function buildClientContextPrompt(data: ClientContextData): string {
  const {
    clientName,
    sixCsBaseline,
    exposureIndex,
    founderMatrix,
    founderSnapshot,
    optionalityFramework,
  } = data;

  const sections: string[] = [
    `You are reviewing the Q1 Discover workspace for client: ${clientName}.`,
    `Here is a summary of all available assessment data:`,
  ];

  // Six C's baseline
  if (sixCsBaseline?.has_baseline && sixCsBaseline.six_cs) {
    const { scores, total_score } = sixCsBaseline.six_cs;
    const pct = total_score / MAX_SIX_CS_SCORE;
    const rating =
      pct >= 0.75 ? "Strong" : pct >= 0.5 ? "Adequate" : pct >= 0.25 ? "Weak" : "Underdeveloped";
    const parts = SIX_CS.map((c) => `${c.label}: ${scores[c.id] ?? 0}/3`).join(", ");
    sections.push(
      `SIX C'S BASELINE (from prospect phase): ${parts}. Total: ${total_score}/${MAX_SIX_CS_SCORE} (${rating}).`
    );
  } else {
    sections.push("SIX C'S BASELINE: Not yet assessed.");
  }

  // Exposure Index
  if (exposureIndex?.category_scores) {
    const scores = exposureIndex.category_scores as Record<CategoryId, number>;
    const parts = EXPOSURE_CATEGORIES.map(
      (cat) => `${cat.label}: ${scores[cat.id] ?? 0}/9 (${exposureLevel(scores[cat.id] ?? 0)} exposure)`
    ).join(", ");
    sections.push(`FOUNDER EXPOSURE INDEX: ${parts}.`);
  } else {
    sections.push("FOUNDER EXPOSURE INDEX: Not yet run.");
  }

  // Founder Matrix
  if (founderMatrix?.completed_at) {
    sections.push(
      `FOUNDER MATRIX (${founderMatrix.entity_type.toUpperCase()} intake): Completed on ${new Date(founderMatrix.completed_at).toLocaleDateString()}.`
    );
  } else {
    sections.push("FOUNDER MATRIX: Not yet completed.");
  }

  // Founder Snapshot
  if (founderSnapshot?.responses) {
    const urgentDimensions = SNAPSHOT_DIMENSIONS.filter(
      (d) => founderSnapshot.responses[d.id]?.signal === "urgent"
    ).map((d) => d.label);

    const weakDimensions = SNAPSHOT_DIMENSIONS.filter(
      (d) => founderSnapshot.responses[d.id]?.signal === "weakening"
    ).map((d) => d.label);

    const summary = SNAPSHOT_DIMENSIONS.map((d) => {
      const r = founderSnapshot.responses[d.id];
      return `${d.label}: ${r?.signal ?? "not assessed"}`;
    }).join(", ");

    sections.push(`FOUNDER SNAPSHOT: ${summary}.`);

    if (urgentDimensions.length > 0) {
      sections.push(
        `⚠️ URGENT DIMENSIONS requiring immediate attention: ${urgentDimensions.join(", ")}.`
      );
    }
    if (weakDimensions.length > 0) {
      sections.push(`⚡ WEAKENING DIMENSIONS to monitor: ${weakDimensions.join(", ")}.`);
    }
  } else {
    sections.push("FOUNDER SNAPSHOT: Not yet taken.");
  }

  // Optionality Framework
  if (optionalityFramework?.responses) {
    const failedConditions = OPTIONALITY_CONDITIONS.filter(
      (c) => optionalityFramework.responses[c.id]?.status === "no"
    ).map((c) => c.label);

    const metConditions = OPTIONALITY_CONDITIONS.filter(
      (c) => optionalityFramework.responses[c.id]?.status === "yes"
    ).map((c) => c.label);

    sections.push(
      `OPTIONALITY FRAMEWORK: ${metConditions.length}/${OPTIONALITY_CONDITIONS.length} conditions met.`
    );

    if (failedConditions.length > 0) {
      sections.push(
        `🔴 CONDITIONS NOT MET — blocking optionality: ${failedConditions.join(", ")}.`
      );
    }
  } else {
    sections.push("OPTIONALITY FRAMEWORK: Not yet assessed.");
  }

  sections.push(
    "Based on all the above, provide a comprehensive analysis of this founder's current position, " +
    "identify the top 3 priority areas, and recommend the most impactful next actions for the advisor."
  );

  return sections.join("\n\n");
}

export function buildSixCsPrompt(
  prospectName: string,
  scores: Record<string, number>,
  totalScore: number
): string {
  const pct = totalScore / MAX_SIX_CS_SCORE;
  const rating =
    pct >= 0.75 ? "Strong" : pct >= 0.5 ? "Adequate" : pct >= 0.25 ? "Weak" : "Underdeveloped";
  const parts = SIX_CS.map((c) => `${c.label} ${scores[c.id] ?? 0}/3`).join(", ");
  return (
    `Analyze the Six C's assessment for ${prospectName}. ` +
    `Scores: ${parts} (total ${totalScore}/${MAX_SIX_CS_SCORE} — ${rating}). ` +
    `What are their strongest and weakest capital readiness signals? What should the advisor focus on?`
  );
}

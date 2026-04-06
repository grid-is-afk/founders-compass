import { useMemo } from "react";
import { computeScoredPercentage, computeValueFactorsSummary } from "@/lib/assessmentUtils";
import type { ClientAssessments } from "@/lib/types/assessments";

const EMPTY_ASSESSMENTS: ClientAssessments = {
  clientId: "",
  businessAttractiveness: null,
  businessReadiness: null,
  personalReadiness: null,
  valueFactors: null,
};

export interface AssessmentScores {
  assessments: ClientAssessments;
  baScore: number;
  brScore: number;
  prScore: number;
  vfSummary: { positive: number; neutral: number; improvement: number; total: number; strengthPercentage: number };
  vfScore: number;
  lastAssessmentDate: string;
}

export function useAssessmentScores(
  clientAssessments: ClientAssessments = EMPTY_ASSESSMENTS
): AssessmentScores {
  return useMemo(() => {
    const { businessAttractiveness, businessReadiness, personalReadiness, valueFactors } = clientAssessments;

    const baScore = businessAttractiveness ? computeScoredPercentage(businessAttractiveness.factors) : 0;
    const brScore = businessReadiness ? computeScoredPercentage(businessReadiness.factors) : 0;
    const prScore = personalReadiness ? computeScoredPercentage(personalReadiness.factors) : 0;
    const vfSummary = valueFactors
      ? computeValueFactorsSummary(valueFactors.factors)
      : { positive: 0, neutral: 0, improvement: 0, total: 0, strengthPercentage: 0 };

    const dates = [
      businessAttractiveness?.completedDate,
      businessReadiness?.completedDate,
      personalReadiness?.completedDate,
      valueFactors?.completedDate,
    ].filter(Boolean) as string[];

    const lastAssessmentDate =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "No assessments";

    return {
      assessments: clientAssessments,
      baScore,
      brScore,
      prScore,
      vfSummary,
      vfScore: vfSummary.strengthPercentage,
      lastAssessmentDate,
    };
  }, [clientAssessments]);
}

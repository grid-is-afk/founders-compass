import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SixCsSummary {
  total_score: number;
  scores: Record<string, number>;
  completed_at: string;
}

export interface ExposureIndexSummary {
  total: number;
  category_scores: Record<string, number>;
  completed_at: string;
}

export interface FounderMatrixSummary {
  entity_type: string;
  completed_at: string;
}

export interface FounderSnapshotSummary {
  responses: Record<string, { signal?: string }>;
  completed_at: string;
}

export interface OptionalityFrameworkSummary {
  conditions_met: number;
  total: number;
  completed_at: string;
}

export interface SixKeysSummary {
  scores: Record<string, number | null>;
  scored_count: number;
  completed_at: string;
}

export interface CapitalOptionalitySummary {
  scenarios_set: number;
  completed_at: string;
}

export interface MultiplesSummary {
  initial_multiple: number | null;
  current_multiple: number | null;
  best_in_class: number | null;
  goal_multiple: number | null;
}

export interface AssessmentSummary {
  prospect: {
    six_cs: SixCsSummary | null;
    exposure_index: ExposureIndexSummary | null;
  };
  q1_discover: {
    exposure_index: ExposureIndexSummary | null;
    founder_matrix: FounderMatrixSummary | null;
    founder_snapshot: FounderSnapshotSummary | null;
    optionality_framework: OptionalityFrameworkSummary | null;
  };
  ongoing: {
    six_keys: SixKeysSummary | null;
    capital_optionality: CapitalOptionalitySummary | null;
    multiples: MultiplesSummary | null;
  };
  action_items: {
    total: number;
    done: number;
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useClientAssessmentSummary(clientId: string) {
  return useQuery<AssessmentSummary>({
    queryKey: ["client-assessment-summary", clientId],
    queryFn: () => api.get(`/clients/${clientId}/assessment-summary`),
    enabled: !!clientId,
  });
}

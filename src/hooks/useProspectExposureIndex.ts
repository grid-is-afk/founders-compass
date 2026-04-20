import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api";
import type { CategoryId } from "@/lib/exposureIndexQuestions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExposureIndexRecord {
  id: string;
  prospect_id: string;
  advisor_id: string;
  responses: Record<string, number[]>;
  category_scores: Record<CategoryId, number>;
  ai_summary: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

/** Lightweight summary returned by the bulk endpoint */
export interface ExposureIndexSummary {
  id: string;
  prospect_id: string;
  category_scores: Record<CategoryId, number>;
  completed_at: string;
}

export type ExposureIndexMap = Record<string, ExposureIndexSummary>;

export interface SubmitExposurePayload {
  responses: Record<string, number[]>;
  category_scores: Record<CategoryId, number>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all exposure index summaries for the advisor's prospects.
 * Optionally filter by prospect status (e.g. "intake").
 * Returns a lookup map keyed by prospect_id for O(1) access in the pipeline UI.
 */
export function useExposureIndexMap(status?: string): {
  data: ExposureIndexMap;
  isLoading: boolean;
} {
  const path = status
    ? `/prospects/exposure-indexes?status=${encodeURIComponent(status)}`
    : "/prospects/exposure-indexes";

  const { data, isLoading } = useQuery<ExposureIndexSummary[]>({
    queryKey: ["exposure-indexes", status ?? "all"],
    queryFn: () => api.get(path),
  });

  const map = useMemo<ExposureIndexMap>(() => {
    const result: ExposureIndexMap = {};
    if (data) {
      for (const item of data) {
        result[item.prospect_id] = item;
      }
    }
    return result;
  }, [data]);

  return { data: map, isLoading };
}

/**
 * Fetch the full assessment record for a single prospect.
 * Returns null if the assessment has not been taken.
 */
export function useProspectExposureIndex(prospectId: string | null) {
  return useQuery<ExposureIndexRecord | null>({
    queryKey: ["exposure-index", prospectId],
    queryFn: () => api.get(`/prospects/${prospectId}/exposure-index`),
    enabled: !!prospectId,
  });
}

/**
 * Submit a new exposure index assessment.
 */
export function useSubmitExposureIndex(prospectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitExposurePayload) =>
      api.post(`/prospects/${prospectId}/exposure-index`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exposure-index", prospectId] });
      qc.invalidateQueries({ queryKey: ["exposure-indexes"] });
    },
  });
}

/**
 * Overwrite an existing assessment (retake).
 */
export function useRetakeExposureIndex(prospectId: string, assessmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitExposurePayload) =>
      api.patch(`/prospects/${prospectId}/exposure-index/${assessmentId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exposure-index", prospectId] });
      qc.invalidateQueries({ queryKey: ["exposure-indexes"] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SixCsRecord {
  id: string;
  prospect_id: string;
  advisor_id: string;
  scores: Record<string, number>;
  total_score: number;
  notes: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface SixCsSummary {
  id: string;
  prospect_id: string;
  scores: Record<string, number>;
  total_score: number;
  completed_at: string;
}

export type SixCsMap = Record<string, SixCsSummary>;

export interface UpsertSixCsPayload {
  scores: Record<string, number>;
  total_score: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Bulk-fetch Six C's summaries for the pipeline, keyed by prospect_id.
 * Optionally filter by prospect status (e.g. "fit_assessment").
 */
export function useSixCsMap(status?: string): {
  data: SixCsMap;
  isLoading: boolean;
} {
  const path = status
    ? `/prospects/six-cs-map?status=${encodeURIComponent(status)}`
    : "/prospects/six-cs-map";

  const { data, isLoading } = useQuery<SixCsSummary[]>({
    queryKey: ["six-cs-map", status ?? "all"],
    queryFn: () => api.get(path),
  });

  const map = useMemo<SixCsMap>(() => {
    const result: SixCsMap = {};
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
 * Fetch the Six C's record for a single prospect. Returns null if not taken.
 */
export function useProspectSixCs(prospectId: string | null) {
  return useQuery<SixCsRecord | null>({
    queryKey: ["six-cs", prospectId],
    queryFn: () => api.get(`/prospects/${prospectId}/six-cs`),
    enabled: !!prospectId,
  });
}

/**
 * Upsert (save or replace) a Six C's assessment for a prospect.
 */
export function useUpsertSixCs(prospectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertSixCsPayload) =>
      api.post(`/prospects/${prospectId}/six-cs`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["six-cs", prospectId] });
      qc.invalidateQueries({ queryKey: ["six-cs-map"] });
    },
  });
}

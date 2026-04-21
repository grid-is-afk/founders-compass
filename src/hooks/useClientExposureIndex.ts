import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CategoryId } from "@/lib/exposureIndexQuestions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientExposureIndexRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  responses: Record<string, number[]>;
  category_scores: Record<CategoryId, number>;
  ai_summary: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitClientExposurePayload {
  responses: Record<string, number[]>;
  category_scores: Record<CategoryId, number>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the latest Exposure Index record for a client.
 * Returns null if assessment has not been run.
 */
export function useClientExposureIndex(clientId: string | null) {
  return useQuery<ClientExposureIndexRecord | null>({
    queryKey: ["client-exposure-index", clientId],
    queryFn: () => api.get(`/clients/${clientId}/exposure-index`),
    enabled: !!clientId,
  });
}

/**
 * Submit (upsert) a new Exposure Index for a client.
 */
export function useSubmitClientExposureIndex(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitClientExposurePayload) =>
      api.post(`/clients/${clientId}/exposure-index`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-exposure-index", clientId] });
    },
  });
}

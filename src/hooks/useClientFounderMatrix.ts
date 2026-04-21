import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientFounderMatrixRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  entity_type: "corp" | "llc";
  responses: Record<string, unknown>;
  ai_summary: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitFounderMatrixPayload {
  entity_type: "corp" | "llc";
  responses: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the latest Founder Matrix record for a client.
 * Returns null if intake has not been completed.
 */
export function useClientFounderMatrix(clientId: string | null) {
  return useQuery<ClientFounderMatrixRecord | null>({
    queryKey: ["client-founder-matrix", clientId],
    queryFn: () => api.get(`/clients/${clientId}/founder-matrix`),
    enabled: !!clientId,
  });
}

/**
 * Submit (upsert) a Founder Matrix intake for a client.
 */
export function useSubmitClientFounderMatrix(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitFounderMatrixPayload) =>
      api.post(`/clients/${clientId}/founder-matrix`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-founder-matrix", clientId] });
    },
  });
}

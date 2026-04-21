import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptionalityConditionResponse {
  status: "yes" | "no";
  notes: string;
}

export interface ClientOptionalityFrameworkRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  responses: Record<string, OptionalityConditionResponse>;
  ai_summary: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitOptionalityPayload {
  responses: Record<string, OptionalityConditionResponse>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the latest Optionality Framework record for a client.
 * Returns null if not yet assessed.
 */
export function useClientOptionalityFramework(clientId: string | null) {
  return useQuery<ClientOptionalityFrameworkRecord | null>({
    queryKey: ["client-optionality-framework", clientId],
    queryFn: () => api.get(`/clients/${clientId}/optionality-framework`),
    enabled: !!clientId,
  });
}

/**
 * Submit (upsert) an Optionality Framework assessment for a client.
 */
export function useSubmitClientOptionalityFramework(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitOptionalityPayload) =>
      api.post(`/clients/${clientId}/optionality-framework`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-optionality-framework", clientId] });
    },
  });
}

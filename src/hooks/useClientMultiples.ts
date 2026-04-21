import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientMultiplesRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  initial_multiple: string | null;
  current_multiple: string | null;
  best_in_class: string | null;
  goal_multiple: string | null;
  notes: string | null;
  updated_at: string;
}

export interface SubmitMultiplesPayload {
  initial_multiple?: number | null;
  current_multiple?: number | null;
  best_in_class?: number | null;
  goal_multiple?: number | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the latest Multiples record for a client.
 * Returns null if not yet set.
 * Note: Postgres NUMERIC comes back as string — parse at display time.
 */
export function useClientMultiples(clientId: string | null) {
  return useQuery<ClientMultiplesRecord | null>({
    queryKey: ["client-multiples", clientId],
    queryFn: () => api.get(`/clients/${clientId}/multiples`),
    enabled: !!clientId,
  });
}

/**
 * Submit (upsert) Multiples for a client.
 */
export function useSubmitMultiples(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitMultiplesPayload) =>
      api.post(`/clients/${clientId}/multiples`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-multiples", clientId] });
    },
  });
}

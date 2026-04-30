import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmitSixKeysPayload {
  clarity?: number;
  alignment?: number;
  structure?: number;
  stewardship?: number;
  velocity?: number;
  legacy?: number;
  notes?: string | null;
}

export interface ClientSixKeysRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  clarity: number | null;
  alignment: number | null;
  structure: number | null;
  stewardship: number | null;
  velocity: number | null;
  legacy: number | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch the latest Six Keys record for a client.
 * Returns null if assessment has not been run.
 */
export function useClientSixKeys(clientId: string | null) {
  return useQuery<ClientSixKeysRecord | null>({
    queryKey: ["client-six-keys", clientId],
    queryFn: () => api.get(`/clients/${clientId}/six-keys`),
    enabled: !!clientId,
  });
}

export function useSubmitClientSixKeys(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitSixKeysPayload) =>
      api.post(`/clients/${clientId}/six-keys`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-six-keys", clientId] });
    },
  });
}

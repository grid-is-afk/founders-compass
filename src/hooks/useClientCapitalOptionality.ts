import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientCapitalOptionalityRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  minority_recap_pct: number;
  minority_recap_label: string;
  strategic_acq_pct: number;
  strategic_acq_label: string;
  esop_pct: number;
  esop_label: string;
  full_exit_pct: number;
  full_exit_label: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitCapitalOptionalityPayload {
  minority_recap_pct: number;
  minority_recap_label: string;
  strategic_acq_pct: number;
  strategic_acq_label: string;
  esop_pct: number;
  esop_label: string;
  full_exit_pct: number;
  full_exit_label: string;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the latest Capital Optionality record for a client.
 * Returns null if not yet set.
 */
export function useClientCapitalOptionality(clientId: string | null) {
  return useQuery<ClientCapitalOptionalityRecord | null>({
    queryKey: ["client-capital-optionality", clientId],
    queryFn: () => api.get(`/clients/${clientId}/capital-optionality`),
    enabled: !!clientId,
  });
}

/**
 * Submit (upsert) Capital Optionality for a client.
 */
export function useSubmitCapitalOptionality(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitCapitalOptionalityPayload) =>
      api.post(`/clients/${clientId}/capital-optionality`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-capital-optionality", clientId] });
    },
  });
}

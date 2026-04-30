import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReconcileFinding {
  c: string;
  self_score: number;
  status: "confirmed" | "gap" | "discrepancy";
  finding: string;
  suggested_score: number;
}

export interface SixCsReconcileRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  findings: ReconcileFinding[];
  summary: string | null;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the most recent Six C's reconciliation for a client.
 * Returns null when no reconciliation has been run yet.
 */
export function useClientSixCsReconcile(clientId: string | null) {
  return useQuery<SixCsReconcileRecord | null>({
    queryKey: ["six-cs-reconcile", clientId],
    queryFn: () => api.get(`/clients/${clientId}/six-cs-reconcile`),
    enabled: !!clientId,
  });
}

/**
 * Trigger QB AI to generate a new Six C's reconciliation (POST).
 * Invalidates the GET query on success so the UI updates automatically.
 */
export function useGenerateSixCsReconcile(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation<SixCsReconcileRecord, Error>({
    mutationFn: () =>
      api.post(`/clients/${clientId}/six-cs-reconcile`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["six-cs-reconcile", clientId],
      });
    },
  });
}

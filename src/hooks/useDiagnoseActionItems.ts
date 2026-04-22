import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiagnoseTask {
  id: string;
  client_id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "high" | "medium" | "low";
  phase: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch existing diagnose-phase tasks for a client.
 */
export function useDiagnoseActionItems(clientId: string) {
  return useQuery<DiagnoseTask[]>({
    queryKey: ["diagnose-action-items", clientId],
    queryFn: () => api.get(`/clients/${clientId}/diagnose-action-items`),
    enabled: !!clientId,
  });
}

/**
 * Generate new action items via QB AI (POST).
 * Replaces any existing diagnose-phase tasks with AI-generated ones.
 */
export function useGenerateDiagnoseActionItems(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation<DiagnoseTask[], Error>({
    mutationFn: () =>
      api.post(`/clients/${clientId}/diagnose-action-items`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["diagnose-action-items", clientId],
      });
    },
  });
}

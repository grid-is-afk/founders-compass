import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IpdAxisPoint {
  axis: string;
  value: number;
}

export interface ClientIpdMetricsRecord {
  id: string;
  client_id: string;
  persuasiveness_of_problem: string | null;
  confidence_in_solution: string | null;
  combined_index: string | null;
  probability_label: string | null;
  problem_axes: IpdAxisPoint[] | null;
  solution_axes: IpdAxisPoint[] | null;
  generated_from_data_room: boolean;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch the latest IPD metrics record for a client.
 * Returns null if the Data Room has not yet generated results.
 */
export function useClientIpdMetrics(clientId: string | null) {
  return useQuery<ClientIpdMetricsRecord | null>({
    queryKey: ["client-ipd-metrics", clientId],
    queryFn: () => api.get(`/clients/${clientId}/ipd-metrics`),
    enabled: !!clientId,
  });
}

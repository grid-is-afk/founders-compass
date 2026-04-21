import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SnapshotSignal = "strong" | "weakening" | "urgent";

export interface SnapshotDimensionResponse {
  signal: SnapshotSignal;
  notes?: string;
}

export interface ClientFounderSnapshotRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  responses: Record<string, SnapshotDimensionResponse>;
  ai_summary: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitFounderSnapshotPayload {
  responses: Record<string, SnapshotDimensionResponse>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the latest Founder Snapshot record for a client.
 * Returns null if snapshot has not been taken.
 */
export function useClientFounderSnapshot(clientId: string | null) {
  return useQuery<ClientFounderSnapshotRecord | null>({
    queryKey: ["client-founder-snapshot", clientId],
    queryFn: () => api.get(`/clients/${clientId}/founder-snapshot`),
    enabled: !!clientId,
  });
}

/**
 * Submit (upsert) a Founder Snapshot for a client.
 */
export function useSubmitClientFounderSnapshot(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitFounderSnapshotPayload) =>
      api.post(`/clients/${clientId}/founder-snapshot`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-founder-snapshot", clientId] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UpsertSixCsPayload } from "./useProspectSixCs";

export interface ClientSixCsRecord {
  id: string;
  client_id: string;
  scores: Record<string, number>;
  total_score: number;
  notes: string | null;
  completed_at: string;
}

export function useClientSixCs(clientId: string | null) {
  return useQuery<ClientSixCsRecord | null>({
    queryKey: ["client-six-cs", clientId],
    queryFn: () => api.get(`/clients/${clientId}/six-cs`),
    enabled: !!clientId,
  });
}

export function useUpsertClientSixCs(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertSixCsPayload) =>
      api.post(`/clients/${clientId}/six-cs`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-six-cs", clientId] });
      qc.invalidateQueries({ queryKey: ["client-six-cs-baseline", clientId] });
    },
  });
}

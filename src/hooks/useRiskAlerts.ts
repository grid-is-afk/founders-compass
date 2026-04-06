import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientRiskAlerts(clientId: string) {
  return useQuery({
    queryKey: ["risk-alerts", clientId],
    queryFn: () => api.get(`/risk-alerts?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateRiskAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/risk-alerts", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["risk-alerts", vars.client_id as string] }),
  });
}

export function useUpdateRiskAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, ...data }: { id: string; clientId: string } & Record<string, unknown>) =>
      api.patch(`/risk-alerts/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["risk-alerts", vars.clientId] }),
  });
}

export function useDeleteRiskAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/risk-alerts/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["risk-alerts", vars.clientId] }),
  });
}

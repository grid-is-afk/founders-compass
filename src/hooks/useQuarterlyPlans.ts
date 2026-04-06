import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientQuarterlyPlans(clientId: string) {
  return useQuery({
    queryKey: ["quarterly-plans", clientId],
    queryFn: () => api.get(`/quarterly-plans?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateQuarterlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/quarterly-plans", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["quarterly-plans", vars.client_id as string] }),
  });
}

export function useUpdateQuarterlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, ...data }: { id: string; clientId: string } & Record<string, unknown>) =>
      api.patch(`/quarterly-plans/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["quarterly-plans", vars.clientId] }),
  });
}

export function useDeleteQuarterlyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/quarterly-plans/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["quarterly-plans", vars.clientId] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientDeliverables(clientId: string) {
  return useQuery({
    queryKey: ["deliverables", clientId],
    queryFn: () => api.get(`/deliverables?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/deliverables", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["deliverables", vars.client_id as string] }),
  });
}

export function useUpdateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, ...data }: { id: string; clientId: string } & Record<string, unknown>) =>
      api.patch(`/deliverables/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["deliverables", vars.clientId] }),
  });
}

export function useDeleteDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/deliverables/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["deliverables", vars.clientId] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientProtection(clientId: string) {
  return useQuery({
    queryKey: ["protection", clientId],
    queryFn: () => api.get(`/protection?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateProtection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/protection", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["protection", vars.client_id as string] }),
  });
}

export function useUpdateProtection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, ...data }: { id: string; clientId: string } & Record<string, unknown>) =>
      api.patch(`/protection/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["protection", vars.clientId] }),
  });
}

export function useDeleteProtection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/protection/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["protection", vars.clientId] }),
  });
}

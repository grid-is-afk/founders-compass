import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientGrow(clientId: string, chapter = 2) {
  return useQuery({
    queryKey: ["grow", clientId, chapter],
    queryFn: () => api.get(`/grow?client_id=${clientId}&chapter=${chapter}`),
    enabled: !!clientId,
  });
}

export function useCreateGrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/grow", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["grow", vars.client_id as string] }),
  });
}

export function useUpdateGrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, chapter: _chapter, ...data }: { id: string; clientId: string; chapter?: number } & Record<string, unknown>) =>
      api.patch(`/grow/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["grow", vars.clientId] }),
  });
}

export function useDeleteGrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; clientId: string }) =>
      api.delete(`/grow/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["grow", vars.clientId] }),
  });
}

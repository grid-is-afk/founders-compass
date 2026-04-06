import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientDocuments(clientId: string) {
  return useQuery({
    queryKey: ["documents", clientId],
    queryFn: () => api.get(`/documents?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/documents", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["documents", vars.client_id as string] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/documents/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["documents", vars.clientId] }),
  });
}

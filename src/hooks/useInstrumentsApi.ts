import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientInstruments(clientId: string) {
  return useQuery({
    queryKey: ["instruments", clientId],
    queryFn: () => api.get(`/instruments?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/instruments", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["instruments", vars.client_id as string] }),
  });
}

export function useUpdateInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, ...data }: { id: string; clientId: string } & Record<string, unknown>) =>
      api.patch(`/instruments/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["instruments", vars.clientId] }),
  });
}

export function useDeleteInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/instruments/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["instruments", vars.clientId] }),
  });
}

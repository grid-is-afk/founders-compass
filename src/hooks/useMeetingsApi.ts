import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientMeetings(clientId: string) {
  return useQuery({
    queryKey: ["meetings", clientId],
    queryFn: () => api.get(`/meetings?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/meetings", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["meetings", vars.client_id as string] }),
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, ...data }: { id: string; clientId: string } & Record<string, unknown>) =>
      api.patch(`/meetings/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["meetings", vars.clientId] }),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/meetings/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["meetings", vars.clientId] }),
  });
}

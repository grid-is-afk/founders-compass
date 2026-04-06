import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientAssessments(clientId: string) {
  return useQuery({
    queryKey: ["assessments", clientId],
    queryFn: () => api.get(`/assessments?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useSaveAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, type, completed_date, factors }: {
      clientId: string;
      type: string;
      completed_date?: string;
      factors?: unknown[];
    }) => api.put("/assessments", { client_id: clientId, type, completed_date, factors }),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["assessments", vars.clientId] }),
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/assessments/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["assessments", vars.clientId] }),
  });
}

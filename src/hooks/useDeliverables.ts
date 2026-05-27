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

export interface UpdateDeliverableResult extends Record<string, unknown> {
  dataRoomRenamed?: boolean;
}

export function useUpdateDeliverable() {
  const qc = useQueryClient();
  return useMutation<
    UpdateDeliverableResult,
    Error,
    { id: string; clientId: string } & Record<string, unknown>
  >({
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

export interface ArchiveDeliverableResult {
  ok: boolean;
  dataRoomArchived?: boolean;
  dataRoomRestored?: boolean;
}

export function useArchiveDeliverable() {
  const qc = useQueryClient();
  return useMutation<ArchiveDeliverableResult, Error, { id: string; clientId: string }>({
    mutationFn: ({ id }) => api.post(`/deliverables/${id}/archive`, {}),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["deliverables", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["documents", vars.clientId] });
    },
  });
}

export function useUnarchiveDeliverable() {
  const qc = useQueryClient();
  return useMutation<ArchiveDeliverableResult, Error, { id: string; clientId: string }>({
    mutationFn: ({ id }) => api.post(`/deliverables/${id}/unarchive`, {}),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["deliverables", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["documents", vars.clientId] });
    },
  });
}

export interface GenerateResult {
  deliverable: Record<string, unknown>;
  dataRoom: {
    saved: boolean;
    wasUpdate: boolean;
    name: string;
    error?: string;
  };
}

export function useGenerateQuarterlyReview() {
  const qc = useQueryClient();
  return useMutation<GenerateResult, Error, { clientId: string }>({
    mutationFn: (data) => api.post("/deliverables/generate-quarterly-review", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["deliverables", vars.clientId] }),
  });
}

export function useGenerateEngagementBriefing() {
  const qc = useQueryClient();
  return useMutation<GenerateResult, Error, { clientId: string }>({
    mutationFn: (data) => api.post("/deliverables/generate-engagement-briefing", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["deliverables", vars.clientId] }),
  });
}

export function useGenerateReviewPrep(clientId: string) {
  const qc = useQueryClient();
  return useMutation<GenerateResult, Error, { quarter: number }>({
    mutationFn: ({ quarter }) =>
      api.post("/deliverables/generate-review-prep", { clientId, quarter }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables", clientId] }),
  });
}

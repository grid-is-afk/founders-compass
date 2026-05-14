import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Stakeholder {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  notes: string | null;
  tier: "primary" | "secondary" | "peripheral";
  created_at: string;
  updated_at: string | null;
}

export function useStakeholders(clientId: string) {
  return useQuery<Stakeholder[]>({
    queryKey: ["stakeholders", clientId],
    queryFn: () => api.get(`/stakeholders?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Stakeholder, "id" | "created_at" | "updated_at">) =>
      api.post("/stakeholders", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["stakeholders", vars.client_id] }),
  });
}

export function useUpdateStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      clientId,
      ...data
    }: { id: string; clientId: string } & Partial<Omit<Stakeholder, "id" | "client_id" | "created_at" | "updated_at">>) =>
      api.patch(`/stakeholders/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["stakeholders", vars.clientId] }),
  });
}

export function useDeleteStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; clientId: string }) =>
      api.delete(`/stakeholders/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["stakeholders", vars.clientId] }),
  });
}

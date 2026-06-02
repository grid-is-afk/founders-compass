import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ObjectiveStatus = "proposed" | "confirmed" | "achieved" | "dropped";
export type ObjectiveSource = "extracted" | "advisor";

export interface QuarterlyObjective {
  id: string;
  client_id: string;
  plan_id: string | null;
  quarter: number;
  year: number;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  source: ObjectiveSource;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useClientObjectives(clientId: string) {
  return useQuery<QuarterlyObjective[]>({
    queryKey: ["quarterly-objectives", clientId],
    queryFn: () => api.get(`/quarterly-objectives?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

interface CreateObjectiveVars {
  client_id: string;
  quarter: number;
  year: number;
  title: string;
  description?: string | null;
}

export function useCreateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateObjectiveVars) => api.post("/quarterly-objectives", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["quarterly-objectives", vars.client_id] }),
  });
}

interface UpdateObjectiveVars {
  id: string;
  clientId: string;
  title?: string;
  description?: string | null;
  status?: ObjectiveStatus;
}

export function useUpdateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, ...data }: UpdateObjectiveVars) =>
      api.patch(`/quarterly-objectives/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["quarterly-objectives", vars.clientId] }),
  });
}

export function useDeleteObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; clientId: string }) =>
      api.delete(`/quarterly-objectives/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["quarterly-objectives", vars.clientId] }),
  });
}

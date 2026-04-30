import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProspect(id: string | null) {
  const { data: prospects = [], isLoading, isError } = useQuery<Record<string, unknown>[]>({
    queryKey: ["prospects"],
    queryFn: () => api.get("/prospects"),
    enabled: !!id,
  });

  const prospect = id ? prospects.find((p) => p.id === id) ?? null : null;

  return { data: prospect, isLoading, isError };
}

export function useProspects() {
  return useQuery({
    queryKey: ["prospects"],
    queryFn: () => api.get("/prospects"),
  });
}

export function useCreateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/prospects", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/prospects/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });
}

export function useDeleteProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/prospects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });
}

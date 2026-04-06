import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientTasks(clientId: string) {
  return useQuery({
    queryKey: ["tasks", clientId],
    queryFn: () => api.get(`/tasks?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/tasks", data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.client_id as string] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId, ...data }: { id: string; clientId: string } & Record<string, unknown>) =>
      api.patch(`/tasks/${id}`, data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.clientId] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId }: { id: string; clientId: string }) =>
      api.delete(`/tasks/${id}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.clientId] }),
  });
}

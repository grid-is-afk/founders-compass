import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClientTasks(clientId: string) {
  return useQuery({
    queryKey: ["tasks", clientId],
    queryFn: () => api.get(`/tasks?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export interface AdvisorTask {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  assignee: string | null;
  phase: string | null;
  notes: string | null;
}

export function useAdvisorTasks(filters: { status?: string; priority?: string; clientId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.clientId) params.set("client_id", filters.clientId);
  const qs = params.toString();
  return useQuery<AdvisorTask[]>({
    queryKey: ["advisor-tasks", filters],
    queryFn: () => api.get(`/tasks/advisor${qs ? `?${qs}` : ""}`),
  });
}

export function useUpdateAdvisorTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["advisor-tasks"] }),
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

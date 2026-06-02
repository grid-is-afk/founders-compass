import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProposedTask {
  title: string;
  description: string;
  assignee: "advisor" | "client";
  priority: "high" | "medium" | "low";
  /** Methodology activity id this task maps to. */
  activityId: string;
  phase: string;
  rationale: string;
  sourceContext: string;
  /** Back-scheduled due date (YYYY-MM-DD); advisor may move it before applying. */
  dueDate: string | null;
}

export interface KickoffPlanResult {
  tasks: ProposedTask[];
  clientName: string;
  phase: "Discover";
  personalizationLevel: "full" | "methodology-only";
  startDate: string;
  durationDays: number;
  existingKickoffCount: number;
}

export interface KickoffPlanNoScopeMaterials {
  noScopeMaterials: true;
  message: string;
}

/** Options passed to the kickoff-plan generator (scheduling window). */
export interface GenerateKickoffPlanInput {
  startDate?: string;
  durationDays?: number;
}

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
  assignee_id: string | null;
  assignee_name: string | null;
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

export function useGenerateKickoffPlan(clientId: string) {
  return useMutation({
    mutationFn: async (
      input: GenerateKickoffPlanInput = {}
    ): Promise<KickoffPlanResult | KickoffPlanNoScopeMaterials> => {
      const res = await apiFetch(`/clients/${clientId}/kickoff-plan`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
      }
      return res.json() as Promise<KickoffPlanResult | KickoffPlanNoScopeMaterials>;
    },
  });
}

/** Persist a reviewed kickoff plan in one transactional call. `replace` regenerates. */
export function useApplyKickoffPlan(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tasks: ProposedTask[]; replace?: boolean }) =>
      api.post(`/clients/${clientId}/kickoff-plan/apply`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", clientId] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface Meeting {
  id: string;
  client_id: string;
  type: string | null;
  date: string | null;
  notes: string | null;
  status: string;
  agenda: string | null;
  agenda_status: "none" | "draft" | "final";
  capture_notes: string | null;
  decisions: { text: string; recorded_at: string }[];
  transcript_document_id: string | null;
  transcript_name: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AgendaItem {
  text: string;
  source?: string;
}

export interface AgendaSection {
  title: string;
  items: AgendaItem[];
}

export interface ExistingTaskSnapshot {
  id: string;
  title: string;
  status: string;
  phase: string | null;
  notes: string | null;
  due_date: string | null;
  assignee_name: string | null;
}

export interface ProposedChange {
  type: "new_task" | "task_update" | "decision" | "open_question";
  title: string;
  detail: string;
  source_excerpt?: string;
  source_timestamp?: string | null;
  suggested_assignee?: string | null;
  suggested_due_date?: string | null;
  suggested_phase?: string | null;
  suggested_dependencies?: string | null;
  existing_task_id?: string;
  existing_task_snapshot?: ExistingTaskSnapshot;
  confidence: "high" | "medium" | "low";
}

export interface CaptureResult {
  summary: string;
  proposed_changes: ProposedChange[];
}

export interface DeferredCarryforwardItem {
  id: string;
  source_meeting_id: string;
  source_meeting_date: string | null;
  source_meeting_type: string | null;
  change_payload: ProposedChange;
  created_at: string;
}

export function useClientMeetings(clientId: string) {
  return useQuery<Meeting[]>({
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

export function useGenerateAgenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId }: { meetingId: string; clientId: string }) =>
      api.post(`/meetings/${meetingId}/generate-agenda`, {}),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["meetings", vars.clientId] }),
  });
}

export function useCaptureMeeting() {
  return useMutation({
    mutationFn: ({
      meetingId,
      notes,
      documentId,
    }: {
      meetingId: string;
      notes?: string;
      documentId?: string;
    }): Promise<CaptureResult> =>
      api.post(`/meetings/${meetingId}/capture`, {
        notes: notes ?? null,
        document_id: documentId ?? null,
      }),
  });
}

export function useApplyCapture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      meetingId,
      clientId: _clientId,
      approvedChanges,
      deferredChanges,
    }: {
      meetingId: string;
      clientId: string;
      approvedChanges: ProposedChange[];
      deferredChanges?: ProposedChange[];
    }) =>
      api.post(`/meetings/${meetingId}/capture/apply`, {
        approved_changes: approvedChanges,
        deferred_changes: deferredChanges ?? [],
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["meetings", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["tasks", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["deferred-carryforward", vars.meetingId] });
    },
    onError: (err: Error) => {
      toast.error("Failed to apply capture", {
        description: err.message || "Please try again.",
      });
    },
  });
}

export function useDeferredCarryforward(meetingId: string) {
  return useQuery<DeferredCarryforwardItem[]>({
    queryKey: ["deferred-carryforward", meetingId],
    queryFn: () => api.get(`/meetings/${meetingId}/deferred-carryforward`),
    enabled: !!meetingId,
  });
}

export function useResolveDeferred() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deferredId,
      resolvedInMeetingId,
    }: {
      deferredId: string;
      meetingId: string;
      clientId: string;
      resolvedInMeetingId?: string;
    }) =>
      api.patch(`/deferred-changes/${deferredId}`, {
        status: "resolved",
        resolved_in_meeting_id: resolvedInMeetingId,
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["deferred-carryforward", vars.meetingId] });
      toast.success("Item resolved", {
        description: "Removed from carry-over and won't appear in future meetings.",
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to resolve item", {
        description: err.message || "Please try again.",
      });
    },
  });
}

export function useDiscardDeferred() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deferredId,
    }: {
      deferredId: string;
      meetingId: string;
      clientId: string;
    }) =>
      api.patch(`/deferred-changes/${deferredId}`, {
        status: "discarded",
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["deferred-carryforward", vars.meetingId] });
      toast.success("Item discarded", {
        description: "Removed from carry-over and won't appear again.",
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to discard item", {
        description: err.message || "Please try again.",
      });
    },
  });
}

export interface Advisor {
  id: string;
  name: string;
  email: string;
}

export function useAdvisors() {
  return useQuery<Advisor[]>({
    queryKey: ["users", "advisors"],
    queryFn: () => api.get(`/users/advisors`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCheckTranscriptDuplicate() {
  return useMutation({
    mutationFn: ({
      meetingId,
      filename,
    }: {
      meetingId: string;
      filename: string;
    }): Promise<{ exists: boolean; document: { id: string; name: string } | null }> =>
      api.get(`/meetings/${meetingId}/transcript/check?filename=${encodeURIComponent(filename)}`),
  });
}

export function useUploadTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      clientId: _clientId,
      file,
      rename,
    }: {
      meetingId: string;
      clientId: string;
      file: File;
      rename?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (rename) formData.append("rename", rename);

      const token = localStorage.getItem("tfo-access-token");
      const res = await fetch(`/api/meetings/${meetingId}/transcript`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error || `Upload failed ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["meetings", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["documents", vars.clientId] });
    },
  });
}

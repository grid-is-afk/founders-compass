import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface OtterInboxItem {
  id: string;
  otter_conversation_id: string;
  title: string | null;
  participants: string[];
  occurred_at: string | null;
  created_at: string;
}

const INBOX_KEY = ["otter-inbox"];

/** Pending (unassigned) Otter transcripts for the current advisor/admin. */
export function useOtterInbox(pollMs = 60_000) {
  return useQuery<OtterInboxItem[]>({
    queryKey: INBOX_KEY,
    queryFn: () => api.get("/integrations/otter/inbox"),
    refetchInterval: pollMs,
  });
}

/** Lightweight pending count for the sidebar badge. */
export function useOtterInboxCount(pollMs = 60_000) {
  return useQuery<{ count: number }>({
    queryKey: [...INBOX_KEY, "count"],
    queryFn: () => api.get("/integrations/otter/inbox/count"),
    refetchInterval: pollMs,
  });
}

/** Assign a pending transcript to a client or prospect (files it into the Data Room). */
export function useAssignTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      target,
      targetId,
    }: {
      id: string;
      target: "client" | "prospect";
      targetId: string;
    }) => api.post(`/integrations/otter/inbox/${id}/assign`, { target, target_id: targetId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
    },
  });
}

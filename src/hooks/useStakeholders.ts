import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Sentiment = "positive" | "neutral" | "negative" | "at_risk";

// ---------------------------------------------------------------------------
// Shared design tokens — imported by StakeholdersPanel, AgendaPanel, CapturePanel
// ---------------------------------------------------------------------------

export const SENTIMENT_CONFIG: Record<
  Sentiment,
  { container: string; dot: string; label: string }
> = {
  positive: {
    container: "bg-primary/10 border-primary/30 text-primary",
    dot: "bg-primary",
    label: "positive",
  },
  neutral: {
    container: "bg-muted border-border text-muted-foreground",
    dot: "bg-muted-foreground",
    label: "neutral",
  },
  negative: {
    container: "bg-accent/15 border-accent/30 text-accent-foreground",
    dot: "bg-accent",
    label: "concerning",
  },
  at_risk: {
    container: "bg-destructive/10 border-destructive/30 text-destructive",
    dot: "bg-destructive",
    label: "at risk",
  },
};

export const TIER_COLORS: Record<"primary" | "secondary" | "peripheral", string> = {
  primary: "border-primary/30 text-primary bg-primary/5",
  secondary: "border-amber-500/30 text-amber-700 bg-amber-50",
  peripheral: "text-muted-foreground border-border",
};

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
  current_sentiment?: Sentiment | null;
  sentiment_updated_at?: string | null;
}

export interface StakeholderSignal {
  id: string;
  stakeholder_id: string;
  client_id: string;
  signal_type:
    | "manual_note"
    | "meeting_mention"
    | "sentiment"
    | "email_received"
    | "email_sent"
    | "calendar_event"
    | "meeting_attended";
  sentiment?: Sentiment | null;
  value: string | null;
  source_table?: string | null;
  source_id?: string | null;
  created_by?: string | null;
  ts: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Stakeholder CRUD
// ---------------------------------------------------------------------------

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
    mutationFn: (data: Omit<Stakeholder, "id" | "created_at" | "updated_at" | "current_sentiment" | "sentiment_updated_at">) =>
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

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

export function useStakeholderSignals(
  stakeholderId: string,
  opts?: { limit?: number; enabled?: boolean }
) {
  const { limit = 50, enabled = true } = opts ?? {};
  return useQuery<StakeholderSignal[]>({
    queryKey: ["stakeholder-signals", stakeholderId],
    queryFn: () => api.get(`/stakeholders/${stakeholderId}/signals?limit=${limit}`),
    enabled: !!stakeholderId && enabled,
  });
}

export function useCreateStakeholderSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      stakeholderId,
      signal_type,
      value,
      sentiment,
    }: {
      stakeholderId: string;
      clientId: string;
      signal_type: "manual_note" | "sentiment";
      value: string;
      sentiment?: Sentiment;
    }): Promise<StakeholderSignal> =>
      api.post(`/stakeholders/${stakeholderId}/signals`, {
        signal_type,
        value,
        ...(sentiment ? { sentiment } : {}),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["stakeholder-signals", vars.stakeholderId] });
      // Sentiment signals update the snapshot column — refresh the list too
      qc.invalidateQueries({ queryKey: ["stakeholders", vars.clientId] });
    },
  });
}

export function useUpdateStakeholderSentiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      sentiment,
    }: {
      id: string;
      clientId: string;
      stakeholderId: string;
      sentiment: Sentiment | null;
    }) =>
      api.patch(`/stakeholders/${id}`, { current_sentiment: sentiment }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["stakeholders", vars.clientId] });
      // Backend writes a history row — refresh the signal timeline too
      qc.invalidateQueries({ queryKey: ["stakeholder-signals", vars.stakeholderId] });
    },
  });
}

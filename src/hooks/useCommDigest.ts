import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// UC-04 — Cross-channel communication digest (per client).

export type CommChannel = "meeting" | "gmail" | "zoom" | "whatsapp";
export type DigestSentiment = "positive" | "neutral" | "negative" | "mixed";

export interface DigestTopic {
  topic: string;
  summary: string;
  channels: CommChannel[];
  eventIds: string[];
  sentiment: DigestSentiment;
}

export interface CommDigest {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  topics: DigestTopic[];
  source_channels: CommChannel[];
  event_count: number;
  generated_by: string | null;
  generated_at: string;
}

export interface GenerateDigestResult {
  digest: CommDigest;
  channelsRun: CommChannel[];
  channelsPending: CommChannel[];
}

export interface GenerateDigestInput {
  range?: "week";
  periodStart?: string;
  periodEnd?: string;
}

const digestsKey = (clientId: string) => ["comm-digests", clientId];

export function useClientDigests(clientId: string | null) {
  return useQuery<CommDigest[]>({
    queryKey: digestsKey(clientId ?? ""),
    queryFn: () => api.get(`/communications/${clientId}/digests`),
    enabled: !!clientId,
  });
}

export function useGenerateDigest(clientId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<GenerateDigestResult, Error, GenerateDigestInput>({
    mutationFn: (input) => api.post(`/communications/${clientId}/digest`, input),
    onSuccess: () => {
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: digestsKey(clientId) });
      }
    },
  });
}

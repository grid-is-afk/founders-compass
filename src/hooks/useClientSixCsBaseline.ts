import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SixCsBaselineSummary {
  id: string;
  prospect_id?: string;  // set when baseline came from prospect pipeline
  client_id?: string;    // set when baseline was run directly on the client
  scores: Record<string, number>;
  total_score: number;
  completed_at: string;
}

export interface DocumentItem {
  category: string;
  label: string;
}

export interface ClientSixCsBaselineResult {
  six_cs: SixCsBaselineSummary | null;
  document_checklist: DocumentItem[];
  has_baseline: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch the Six C's baseline carried over from the linked prospect.
 * Also returns a generated document checklist based on scores.
 * If no prospect is linked, has_baseline = false and a static checklist is returned.
 */
export function useClientSixCsBaseline(clientId: string | null) {
  return useQuery<ClientSixCsBaselineResult>({
    queryKey: ["client-six-cs-baseline", clientId],
    queryFn: () => api.get(`/clients/${clientId}/six-cs-baseline`),
    enabled: !!clientId,
  });
}

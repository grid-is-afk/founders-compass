import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface HubspotSyncResult {
  ok: boolean;
  dealsScanned: number;
  prospectsCreated: number;
  prospectsUpdated: number;
  skipped: number;
  pitchDecksImported: number;
  error?: string;
}

/** Triggers an on-demand HubSpot → platform sync, then refreshes the prospect board. */
export function useHubspotSync() {
  const qc = useQueryClient();
  return useMutation<HubspotSyncResult, Error>({
    mutationFn: () => api.post("/admin/hubspot/sync", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });
}

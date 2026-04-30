import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ClientIpValueFrameworkRecord {
  id: string;
  client_id: string;
  advisor_id: string;
  ip_type: string | null;
  ip_status: string | null;
  valuation_basis: string | null;
  notes: string | null;
  ai_summary: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitIpValueFrameworkPayload {
  ip_type?: string | null;
  ip_status?: string | null;
  valuation_basis?: string | null;
  notes?: string | null;
}

export function useClientIpValueFramework(clientId: string | null) {
  return useQuery<ClientIpValueFrameworkRecord | null>({
    queryKey: ["client-ip-value-framework", clientId],
    queryFn: () => api.get(`/clients/${clientId}/ip-value-framework`),
    enabled: !!clientId,
  });
}

export function useSubmitClientIpValueFramework(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitIpValueFrameworkPayload) =>
      api.post(`/clients/${clientId}/ip-value-framework`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-ip-value-framework", clientId] });
    },
  });
}

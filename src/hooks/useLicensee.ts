import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PillarKey, RiskBand, RiskTag } from "@/lib/licenseeIntake";

export interface PillarScore {
  pct: number;
  band: RiskBand;
}

export interface LicenseeIntake {
  id: string;
  client_id: string;
  version: number;
  status: "in_progress" | "complete";
  cepa_name: string | null;
  firm_name: string | null;
  completed_date: string | null;
  annual_revenue: string | null;
  num_owners: number | null;
  owner_ages: string | null;
  industry: string | null;
  exit_horizon: string | null;
  vam_phase: string | null;
  pillar_scores: Record<PillarKey, PillarScore> | null;
  completed_at: string | null;
}

export interface IntakeResponse {
  pillar: PillarKey;
  question_key: string;
  answer_value: string | null;
  risk_tag: RiskTag | null;
  notes: string | null;
}

export interface IntakeBundle {
  intake: LicenseeIntake | null;
  responses: IntakeResponse[];
}

export function useClientIntake(clientId: string) {
  return useQuery<IntakeBundle>({
    queryKey: ["licensee-intake", clientId],
    queryFn: () => api.get(`/clients/${clientId}/intake`),
    enabled: !!clientId,
  });
}

export function useSaveIntake(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.put(`/clients/${clientId}/intake`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["licensee-intake", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

// ── Referrals ──────────────────────────────────────────────────────────────

export interface ReferralPartner {
  id: string;
  name: string;
  occupation: string | null;
  specialty: string | null;
  testimonials: string | null;
  rating: number | null;
  headshot_url: string | null;
}

export interface ReferralRequest {
  id: string;
  client_id: string;
  pillar: PillarKey | null;
  partner_id: string | null;
  partner_name: string | null;
  partner_specialty: string | null;
  note: string | null;
  status: "requested" | "in_progress" | "connected";
  outcome: string | null;
  requested_at: string;
}

export function useReferralPartners() {
  return useQuery<ReferralPartner[]>({
    queryKey: ["referral-partners"],
    queryFn: () => api.get("/referral-partners"),
  });
}

export function useClientReferrals(clientId: string) {
  return useQuery<ReferralRequest[]>({
    queryKey: ["referrals", clientId],
    queryFn: () => api.get(`/clients/${clientId}/referrals`),
    enabled: !!clientId,
  });
}

export function useCreateReferral(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { pillar?: string; partner_id?: string; note?: string }) =>
      api.post(`/clients/${clientId}/referrals`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referrals", clientId] }),
  });
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PriorityAction {
  id: string;
  type: string;
  label: string;
  client_id: string;
  client_name: string;
  severity: "critical" | "warning" | "info";
  meta?: string;
}

export interface DataGap {
  client_id: string;
  client_name: string;
  gap: string;
  type: string;
}

export interface InsuranceItem {
  id: string;
  category: string;
  label: string;
  status: string;
  risk: string | null;
  recommendation: string | null;
  client_id: string;
  client_name: string;
}

export function usePriorityActions(clientId?: string) {
  return useQuery<PriorityAction[]>({
    queryKey: ["dashboard-priority-actions", clientId ?? "all"],
    queryFn: () => api.get(clientId ? `/dashboard/priority-actions?client_id=${clientId}` : "/dashboard/priority-actions"),
  });
}

export function useDataGaps(clientId?: string) {
  return useQuery<DataGap[]>({
    queryKey: ["dashboard-data-gaps", clientId ?? "all"],
    queryFn: () => api.get(clientId ? `/dashboard/data-gaps?client_id=${clientId}` : "/dashboard/data-gaps"),
  });
}

export function useDashboardInsurance(clientId?: string) {
  return useQuery<InsuranceItem[]>({
    queryKey: ["dashboard-insurance", clientId ?? "all"],
    queryFn: () => api.get(clientId ? `/dashboard/insurance?client_id=${clientId}` : "/dashboard/insurance"),
  });
}

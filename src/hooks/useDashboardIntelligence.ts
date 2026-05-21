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

export function usePriorityActions() {
  return useQuery<PriorityAction[]>({
    queryKey: ["dashboard-priority-actions"],
    queryFn: () => api.get("/dashboard/priority-actions"),
  });
}

export function useDataGaps() {
  return useQuery<DataGap[]>({
    queryKey: ["dashboard-data-gaps"],
    queryFn: () => api.get("/dashboard/data-gaps"),
  });
}

export function useDashboardInsurance() {
  return useQuery<InsuranceItem[]>({
    queryKey: ["dashboard-insurance"],
    queryFn: () => api.get("/dashboard/insurance"),
  });
}

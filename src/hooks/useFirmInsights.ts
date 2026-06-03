import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type InsightCategory = "working" | "blocker" | "strength" | "weakness";
export type InsightStatus = "draft" | "approved";

export interface FirmInsight {
  id: string;
  category: InsightCategory;
  title: string;
  narrative: string;
  engagements_referenced: string[];
  engagements: { id: string; name: string }[];
  status: InsightStatus;
  generated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface FirmMetrics {
  portfolio: {
    activeEngagements: number;
    byStage: Record<string, number>;
    flaggedEngagements: number;
  };
  deliverables: { total: number; approved: number; approvedPct: number; avgApprovalDays: number | null };
  objectives: { total: number; confirmed: number; proposed: number; confirmedPct: number; orphans: number };
  risks: { byType: { source_type: string; n: number }[]; totalUnresolved: number };
  scopeCreep: { tasksAfterLock: number; objectivesAfterLock: number };
  meetings: { staleEngagements: number };
  grow: { capital_type: string; status: string; n: number }[];
  engagements: { id: string; name: string; stage: string | null }[];
}

const QUERY_KEY = ["firm-insights"];
const METRICS_KEY = ["firm-insights", "metrics"];

export function useFirmMetrics() {
  return useQuery<FirmMetrics>({
    queryKey: METRICS_KEY,
    queryFn: () => api.get("/firm-insights/metrics"),
  });
}

export function useFirmInsights() {
  return useQuery<FirmInsight[]>({
    queryKey: QUERY_KEY,
    queryFn: () => api.get("/firm-insights"),
  });
}

export function useRunFirmScan() {
  const queryClient = useQueryClient();
  return useMutation<{ scanned: boolean; insights: number; reason?: string }, Error>({
    mutationFn: () => api.post("/firm-insights/scan", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateInsightStatus() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { id: string; status: "approved" | "dismissed" }>({
    mutationFn: ({ id, status }) => api.patch(`/firm-insights/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

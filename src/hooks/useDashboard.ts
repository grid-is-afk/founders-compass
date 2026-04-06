import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard"),
  });
}

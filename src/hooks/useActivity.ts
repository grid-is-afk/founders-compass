import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useActivity() {
  return useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const data = await api.get("/dashboard");
      return (data?.recentActivity ?? []) as Array<{
        id: string;
        action: string;
        client_name: string | null;
        created_at: string;
      }>;
    },
  });
}

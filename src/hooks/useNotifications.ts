import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, api } from "@/lib/api";

export interface Notification {
  id: string;
  advisor_id: string;
  client_id: string | null;
  client_name: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await apiFetch("/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark notification as read");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark all notifications as read");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Fires once per session on mount. Checks if any assigned clients have a
// quarterly review in exactly 14 days and creates a notification if not already sent.
export function useCheckQuarterlyReviewNotifications() {
  const qc = useQueryClient();
  const hasFired = useRef(false);

  const { mutate } = useMutation({
    mutationFn: () => api.post("/notifications/quarterly-review-check", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!hasFired.current) {
      hasFired.current = true;
      mutate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

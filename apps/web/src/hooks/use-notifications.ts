import { api } from "@/lib/api";
import { notificationsKeys } from "@/lib/query-keys";
import type { AppNotification } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKeys.all,
    queryFn: () => api.get<AppNotification[]>("/notifications"),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationsKeys.unreadCount,
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 30_000,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount });
  };
}

export function useMarkRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => api.patch<AppNotification>(`/notifications/${id}/read`, {}),
    onSuccess: () => invalidate(),
  });
}

export function useMarkAllRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => api.post<{ count: number }>("/notifications/read-all", {}),
    onSuccess: () => invalidate(),
  });
}

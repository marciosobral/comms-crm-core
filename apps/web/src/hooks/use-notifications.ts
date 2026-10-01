import { ApiError, api } from "@/lib/api";
import {
  playSound,
  readAnnouncedCount,
  shouldPlayNotificationSound,
  writeAnnouncedCount,
} from "@/lib/notification-sound";
import { notificationsKeys } from "@/lib/query-keys";
import type { AppNotification } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

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
    refetchIntervalInBackground: true,
  });
}

export function useNotificationSound() {
  return useQuery({
    queryKey: notificationsKeys.sound,
    queryFn: async () => {
      try {
        return await api.download("/notification-sound");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useNotificationArrival(unreadCount: number | undefined) {
  const sound = useNotificationSound();
  const queryClient = useQueryClient();
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (unreadCount === undefined || previous.current === unreadCount) return;
    if (previous.current !== null) {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    }
    if (
      sound.data &&
      shouldPlayNotificationSound(previous.current, readAnnouncedCount(), unreadCount)
    ) {
      playSound(sound.data);
    }
    writeAnnouncedCount(unreadCount);
    previous.current = unreadCount;
  }, [unreadCount, sound.data, queryClient]);
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

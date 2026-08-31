import { Badge } from "@/components/ui";
import {
  notificationBadgeStatus,
  notificationSubtitle,
  notificationTitle,
} from "@/lib/notification-text";
import { relativeNotificationTime } from "@/lib/relative-time";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NotificationRow({
  notification,
  onRead,
  compact = false,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  compact?: boolean;
}) {
  const unread = !notification.readAt;

  return (
    <button
      type="button"
      onClick={() => {
        if (unread) onRead(notification.id);
      }}
      className={cn(
        "flex w-full items-start gap-3 text-left hover:bg-surface-hover",
        compact ? "px-4 py-3" : "px-6 py-4",
      )}
    >
      <span
        className={cn(
          "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
          unread ? "bg-accent" : "bg-transparent",
        )}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge status={notificationBadgeStatus(notification)} />
          {compact ? (
            <span className="ml-auto shrink-0 text-caption text-muted">
              {relativeNotificationTime(notification.createdAt)}
            </span>
          ) : null}
        </div>
        <p className="truncate text-body-medium text-primary">{notificationTitle(notification)}</p>
        <p className="truncate text-caption text-secondary">{notificationSubtitle(notification)}</p>
      </div>

      {!compact ? (
        <span className="shrink-0 text-caption text-muted">
          {relativeNotificationTime(notification.createdAt)}
        </span>
      ) : null}
    </button>
  );
}

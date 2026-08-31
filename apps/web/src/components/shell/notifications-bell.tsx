import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/use-notifications";
import { notificationText } from "@/lib/notification-text";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const count = unreadCount.data?.count ?? 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = (notifications.data ?? []).slice(0, 8);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={count > 0 ? `Notificações: ${count} não lidas` : "Notificações"}
        className="relative flex h-10 w-10 items-center justify-center rounded-md border border-default bg-elevated text-secondary hover:text-primary"
      >
        <Bell size={16} />
        {count > 0 ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
        ) : null}
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-eyebrow text-on-accent">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-md border border-default bg-elevated p-2">
          <div className="flex max-h-80 flex-col gap-1 overflow-auto">
            {items.length === 0 ? (
              <p className="px-3 py-2 text-caption text-muted">Nenhuma notificação</p>
            ) : (
              items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    if (!notification.readAt) markRead.mutate(notification.id);
                  }}
                  className={`rounded-md px-3 py-2 text-left text-body hover:bg-surface-hover ${
                    notification.readAt ? "text-muted" : "text-primary"
                  }`}
                >
                  {notificationText(notification)}
                </button>
              ))
            )}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-default pt-2">
            <Link
              to="/notificacoes"
              onClick={() => setOpen(false)}
              className="text-caption text-accent hover:underline"
            >
              Ver todas
            </Link>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              className="text-caption text-secondary hover:text-primary"
            >
              Marcar todas como lidas
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

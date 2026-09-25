import { NotificationRow } from "@/components/notifications/notification-row";
import { Button } from "@/components/ui";
import { useDismiss } from "@/hooks/use-dismiss";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/use-notifications";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useRef, useState } from "react";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const count = unreadCount.data?.count ?? 0;

  useDismiss(open, [ref], () => setOpen(false));

  const items = (notifications.data ?? []).slice(0, 5);

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
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-eyebrow text-on-accent">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 flex w-94.5 flex-col rounded-xl border border-default bg-elevated shadow-xl">
          <div className="flex items-center justify-between border-b border-subtle px-4 py-4">
            <h3 className="text-h3 text-primary">Notificações</h3>
            <Button variant="secondary" onClick={() => markAllRead.mutate()}>
              Marcar todas como lidas
            </Button>
          </div>

          <div className="flex flex-col divide-y divide-subtle">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-body text-muted">Nenhuma notificação</p>
            ) : (
              items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={(id) => markRead.mutate(id)}
                  compact
                />
              ))
            )}
          </div>

          <div className="border-t border-subtle p-4">
            <Link to="/notificacoes" onClick={() => setOpen(false)} className="block">
              <Button variant="secondary" className="w-full">
                Ver todas as notificações
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

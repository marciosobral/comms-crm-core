import { NotificationRow } from "@/components/notifications/notification-row";
import { usePageMeta } from "@/components/shell/page-meta";
import { Button, Field, Select } from "@/components/ui";
import { useMarkAllRead, useMarkRead, useNotifications } from "@/hooks/use-notifications";
import type { AppNotification, NotificationType } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/notificacoes")({
  component: NotificationsPage,
});

type TypeFilter = "ALL" | NotificationType;
type StatusFilter = "UNREAD_FIRST" | "UNREAD" | "READ";

function NotificationsPage() {
  usePageMeta({ title: "Notificações", breadcrumb: ["CRM", "Notificações"] });
  const notifications = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const [type, setType] = useState<TypeFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("UNREAD_FIRST");

  const items = useMemo(() => {
    const all = notifications.data ?? [];
    const filtered = all.filter((n) => {
      if (type !== "ALL" && n.type !== type) return false;
      if (status === "UNREAD" && n.readAt) return false;
      if (status === "READ" && !n.readAt) return false;
      return true;
    });

    if (status === "UNREAD_FIRST") {
      return [...filtered].sort((a, b) => {
        if (Boolean(a.readAt) === Boolean(b.readAt)) return 0;
        return a.readAt ? 1 : -1;
      });
    }
    return filtered;
  }, [notifications.data, type, status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-end gap-3">
          <div className="w-56">
            <Field label="Tipo" htmlFor="notif-type">
              <Select
                id="notif-type"
                value={type}
                onChange={(e) => setType(e.target.value as TypeFilter)}
              >
                <option value="ALL">Todos os tipos</option>
                <option value="SALE_CHANGE">Venda</option>
                <option value="DUE_DATE">Vencimento</option>
              </Select>
            </Field>
          </div>

          <div className="w-56">
            <Field label="Situação" htmlFor="notif-status">
              <Select
                id="notif-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
              >
                <option value="UNREAD_FIRST">Não lidas primeiro</option>
                <option value="UNREAD">Não lidas</option>
                <option value="READ">Lidas</option>
              </Select>
            </Field>
          </div>
        </div>

        <Button variant="secondary" onClick={() => markAllRead.mutate()}>
          Marcar todas como lidas
        </Button>
      </div>

      <NotificationList items={items} onRead={(id) => markRead.mutate(id)} />
    </div>
  );
}

function NotificationList({
  items,
  onRead,
}: {
  items: AppNotification[];
  onRead: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-default bg-surface py-24">
        <p className="text-body text-muted">Nenhuma notificação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-subtle rounded-lg border border-default bg-surface">
      {items.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} onRead={onRead} />
      ))}
    </div>
  );
}

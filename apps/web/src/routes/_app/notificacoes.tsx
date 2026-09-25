import { NotificationRow } from "@/components/notifications/notification-row";
import { usePageMeta } from "@/components/shell/page-meta";
import { Button, Field, Select } from "@/components/ui";
import { useMarkAllRead, useMarkRead, useNotifications } from "@/hooks/use-notifications";
import { APP_NAME } from "@/lib/brand";
import type { AppNotification } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/notificacoes")({
  component: NotificationsPage,
});

const TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "Todos os tipos" },
  { value: "SALE_CHANGE", label: "Venda" },
  { value: "DUE_DATE", label: "Vencimento" },
] as const;
type TypeFilter = (typeof TYPE_FILTER_OPTIONS)[number]["value"];
function isTypeFilter(value: string): value is TypeFilter {
  return TYPE_FILTER_OPTIONS.some((option) => option.value === value);
}

const STATUS_FILTER_OPTIONS = [
  { value: "UNREAD_FIRST", label: "Não lidas primeiro" },
  { value: "UNREAD", label: "Não lidas" },
  { value: "READ", label: "Lidas" },
] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]["value"];
function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_FILTER_OPTIONS.some((option) => option.value === value);
}

function NotificationsPage() {
  usePageMeta({ title: "Notificações", breadcrumb: [APP_NAME, "Notificações"] });
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
                onChange={(e) => {
                  if (isTypeFilter(e.target.value)) setType(e.target.value);
                }}
              >
                {TYPE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="w-56">
            <Field label="Situação" htmlFor="notif-status">
              <Select
                id="notif-status"
                value={status}
                onChange={(e) => {
                  if (isStatusFilter(e.target.value)) setStatus(e.target.value);
                }}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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

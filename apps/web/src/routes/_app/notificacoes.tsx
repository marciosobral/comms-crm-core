import { Badge, Button, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { useMarkAllRead, useMarkRead, useNotifications } from "@/hooks/use-notifications";
import { formatDate } from "@/lib/format";
import { notificationText } from "@/lib/notification-text";
import { createFileRoute } from "@tanstack/react-router";
import { usePageMeta } from "../_app";

export const Route = createFileRoute("/_app/notificacoes")({
  component: NotificationsPage,
});

function NotificationsPage() {
  usePageMeta({ title: "Notificações", breadcrumb: ["CRM", "Notificações"] });
  const notifications = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = notifications.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-body text-secondary">
          {notifications.data ? `${items.length} notificações` : "Carregando..."}
        </p>
        <Button variant="secondary" onClick={() => markAllRead.mutate()}>
          Marcar todas como lidas
        </Button>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Status</TH>
            <TH>Mensagem</TH>
            <TH align="right">Data</TH>
          </tr>
        </THead>
        <TBody>
          {items.map((notification) => (
            <TR key={notification.id}>
              <TD>{!notification.readAt ? <Badge status="ativo" label="Nova" /> : null}</TD>
              <TD emphasis={!notification.readAt} className="cursor-pointer">
                <button
                  type="button"
                  onClick={() => {
                    if (!notification.readAt) markRead.mutate(notification.id);
                  }}
                  className="w-full truncate text-left"
                >
                  {notificationText(notification)}
                </button>
              </TD>
              <TD align="right">{formatDate(notification.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

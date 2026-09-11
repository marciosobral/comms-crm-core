import type { BadgeStatus } from "@/components/ui";
import type { AppNotification } from "./types";

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function notificationBadgeStatus(n: AppNotification): BadgeStatus {
  return n.type === "DUE_DATE" ? "vencimento" : "venda";
}

export function notificationTitle(n: AppNotification): string {
  const { payload } = n;

  if (n.type === "SALE_CHANGE") {
    const kind = str(payload.kind);
    const detail = str(payload.detail);

    if (kind === "status") {
      const to = detail.split("→").pop()?.trim() ?? detail;
      return `Status alterado para ${to}`;
    }
    if (kind === "seller") {
      const [from, to] = detail.split("→").map((part) => part.trim());
      return `Vendedor alterado de ${from} para ${to}`;
    }
    if (kind === "cancel") {
      return `Venda cancelada - motivo: ${detail}`;
    }
    return detail || "Venda editada";
  }

  if (n.type === "DUE_DATE") {
    const dueDay = num(payload.dueDay);
    const count = num(payload.count);
    const offset = num(payload.offset);
    const when = offset === 0 ? "Hoje" : offset === 1 ? "Amanhã" : `Em ${offset} dias`;
    return `${when} é dia ${dueDay}: ${count} clientes com vencimento`;
  }

  return "Notificação";
}

export function notificationSubtitle(n: AppNotification): string {
  const { payload } = n;

  if (n.type === "SALE_CHANGE") {
    const saleId = str(payload.saleId);
    const customerName = str(payload.customerName);
    const actorName = str(payload.actorName);
    return `Venda ${saleId} - ${customerName} · por ${actorName}`;
  }

  if (n.type === "DUE_DATE") {
    return "Vencimentos do dia - abrir lista filtrada";
  }

  return "";
}

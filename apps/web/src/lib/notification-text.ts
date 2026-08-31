import type { AppNotification } from "./types";

const KIND_LABELS: Record<string, string> = {
  status: "Status alterado",
  seller: "Vendedor alterado",
  cancel: "Venda cancelada",
  update: "Venda editada",
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function notificationText(n: AppNotification): string {
  const { payload } = n;

  if (n.type === "SALE_CHANGE") {
    const actorName = str(payload.actorName);
    const kind = str(payload.kind);
    const detail = str(payload.detail);
    const customerName = str(payload.customerName);
    const kindLabel = KIND_LABELS[kind] ?? kind;
    return `${actorName} — ${kindLabel}: ${detail} (${customerName})`;
  }

  if (n.type === "DUE_DATE") {
    const dueDay = num(payload.dueDay);
    const count = num(payload.count);
    return `Vencimento dia ${dueDay}: ${count} cliente(s) para cobrar`;
  }

  return JSON.stringify(payload);
}

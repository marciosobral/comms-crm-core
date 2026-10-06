import {
  BUSINESS_TIME_ZONE,
  applyMoneyMask,
  businessDateKey,
  parseMoney,
  shiftDateKey,
} from "@comms-crm-core/validation";

export function formatBRL(value: string | number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatMoneyInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return applyMoneyMask(value.toFixed(2).replace(".", ","));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatInstantDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: BUSINESS_TIME_ZONE });
}

export function formatInstantDateTime(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("pt-BR", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatInstantDate(iso)} ${time}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatCompactBRL(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$ ${Math.round(value / 1000).toLocaleString("pt-BR")}k`;
  }
  return formatBRL(value);
}

export function formatLastAccess(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  const dayKey = businessDateKey(date);
  const time = date.toLocaleTimeString("pt-BR", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  if (dayKey === businessDateKey()) return `Hoje, ${time}`;
  if (dayKey === shiftDateKey(businessDateKey(), -1)) return `Ontem, ${time}`;
  return formatInstantDate(iso);
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatBrscan(brscan: boolean | null): string {
  if (brscan === null) return "-";
  return brscan ? "Aprovado" : "Não";
}

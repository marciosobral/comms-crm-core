import type { BadgeStatus } from "@/components/ui";

const STATUS_MAP: Record<string, BadgeStatus> = {
  GROSS: "gross",
  "AG. INSTALAÇÃO": "agInstalacao",
  "AG. BIOMETRIA": "agBiometria",
  CANCELADA: "cancelada",
};

export function saleStatusToBadge(value: string): BadgeStatus {
  return STATUS_MAP[value] ?? "inativo";
}

const BAR_COLOR_MAP: Record<BadgeStatus, string> = {
  gross: "bg-success",
  agInstalacao: "bg-warning",
  agBiometria: "bg-info",
  cancelada: "bg-danger",
  ativo: "bg-success",
  inativo: "bg-muted",
  venda: "bg-accent",
  vencimento: "bg-warning",
};

export function saleStatusBarColor(value: string): string {
  return BAR_COLOR_MAP[saleStatusToBadge(value)];
}

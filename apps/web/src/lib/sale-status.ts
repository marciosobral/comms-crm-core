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

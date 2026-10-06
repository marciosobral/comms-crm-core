import type { BadgeStatus } from "@/components/ui";
import type { DomainType, ImportMappingKind, ImportRowStatus } from "@/lib/types";

export const ROW_STATUS: Record<ImportRowStatus, { label: string; badge: BadgeStatus }> = {
  CREATED: { label: "Criada", badge: "ativo" },
  UPDATED: { label: "Atualizada", badge: "agInstalacao" },
  SKIPPED: { label: "Pulada", badge: "inativo" },
  PENDING: { label: "Pendente", badge: "cancelada" },
};

export const ROW_STATUS_FILTERS: ImportRowStatus[] = ["PENDING", "CREATED", "UPDATED", "SKIPPED"];

export function isImportRowStatus(value: string): value is ImportRowStatus {
  return value === "CREATED" || value === "UPDATED" || value === "SKIPPED" || value === "PENDING";
}

const DOMAIN_LABELS: Partial<Record<DomainType, string>> = {
  SALE_STATUS: "Status",
  PAYMENT_METHOD: "Forma de pagamento",
  MAILING: "Mailing",
  SCHEDULE_PERIOD: "Período",
};

export function mappingKindLabel(kind: ImportMappingKind, domainType: DomainType | null): string {
  if (kind === "USER") return "Usuário";
  if (kind === "PLAN") return "Plano";
  return (domainType ? DOMAIN_LABELS[domainType] : undefined) ?? "Domínio";
}

const FIELD_LABELS: Record<string, string> = {
  seller: "Vendedor",
  supervisor: "Supervisor",
  bko: "BKO",
  auditor: "Auditor",
  internetPlan: "Plano",
  fixedPlan: "Plano",
  status: "Status",
  paymentMethod: "Forma de pagamento",
  mailing: "Mailing",
  schedulePeriod: "Período",
};

export function fieldsLabel(fields: string[]): string {
  const labels = fields.map((field) => FIELD_LABELS[field] ?? field);
  return [...new Set(labels)].join(", ");
}

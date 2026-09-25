import { maskCpfCnpj } from "@comms-crm-core/validation";
import type { Sale } from "../../prisma/generated/prisma/client/client";
import type { PrismaService } from "../prisma";

export type DiffValue = { from: unknown; to: unknown };
export type Diff = Record<string, DiffValue>;

export type ReferenceModel = "domainValue" | "user" | "plan";

export const REFERENCE_FIELD_MODELS: Record<string, ReferenceModel> = {
  statusId: "domainValue",
  paymentMethodId: "domainValue",
  systemId: "domainValue",
  mailingId: "domainValue",
  pdvId: "domainValue",
  schedulePeriodId: "domainValue",
  sellerId: "user",
  supervisorId: "user",
  bkoId: "user",
  auditorId: "user",
  canceledById: "user",
  planId: "plan",
  internetPlanId: "plan",
  fixedPlanId: "plan",
};

export function isDiff(value: unknown): value is Diff {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      "from" in entry &&
      "to" in entry,
  );
}

export function collectReferenceIds(diffs: unknown[]): Record<ReferenceModel, string[]> {
  const idsByModel: Record<ReferenceModel, Set<string>> = {
    domainValue: new Set(),
    user: new Set(),
    plan: new Set(),
  };
  for (const diff of diffs) {
    if (!isDiff(diff)) continue;
    for (const [field, change] of Object.entries(diff)) {
      const model = REFERENCE_FIELD_MODELS[field];
      if (!model) continue;
      for (const value of [change.from, change.to]) {
        if (typeof value === "string" && value) idsByModel[model].add(value);
      }
    }
  }
  return {
    domainValue: [...idsByModel.domainValue],
    user: [...idsByModel.user],
    plan: [...idsByModel.plan],
  };
}

function resolveReferenceLabel(value: unknown, nameById: Map<string, string>): unknown {
  if (typeof value !== "string" || !value) return value;
  return nameById.get(value) ?? "-";
}

// Creation entries carry the entity's own `id`, which is noise in the timeline, so it is dropped.
export function humanizeDiff(
  diff: unknown,
  action: string,
  nameById: Map<string, string>,
): Diff | null {
  if (!isDiff(diff)) return null;
  const humanized: Diff = {};
  for (const [field, change] of Object.entries(diff)) {
    if (action === "CREATE" && field === "id") continue;
    const model = REFERENCE_FIELD_MODELS[field];
    humanized[field] = model
      ? {
          from: resolveReferenceLabel(change.from, nameById),
          to: resolveReferenceLabel(change.to, nameById),
        }
      : change;
  }
  return humanized;
}

export async function resolveHistoryReferenceNames(
  prisma: PrismaService,
  diffs: unknown[],
): Promise<Map<string, string>> {
  const idsByModel = collectReferenceIds(diffs);
  const [domainValues, users, plans] = await Promise.all([
    idsByModel.domainValue.length
      ? prisma.domainValue.findMany({
          where: { id: { in: idsByModel.domainValue } },
          select: { id: true, value: true },
        })
      : Promise.resolve([]),
    idsByModel.user.length
      ? prisma.user.findMany({
          where: { id: { in: idsByModel.user } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    idsByModel.plan.length
      ? prisma.plan.findMany({
          where: { id: { in: idsByModel.plan } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const nameById = new Map<string, string>();
  for (const domainValue of domainValues) nameById.set(domainValue.id, domainValue.value);
  for (const user of users) nameById.set(user.id, user.name);
  for (const plan of plans) nameById.set(plan.id, plan.name);
  return nameById;
}

const AUDITED_SALE_FIELDS = [
  "planId",
  "amount",
  "dueDay",
  "date",
  "paymentMethodId",
  "statusId",
  "pdvId",
  "mailingId",
  "orderNumber",
  "notes",
  "scheduleDate",
  "schedulePeriodId",
  "installedAt",
  "supervisorId",
  "bkoId",
  "auditorId",
  "brscan",
  "bankCode",
  "bankAgency",
  "bankAgencyDigit",
  "bankAccount",
  "bankAccountDigit",
  "bankAccountType",
  "accountHolderIsCustomer",
  "accountHolderName",
  "accountHolderCpf",
] as const;

type AuditedSaleField = (typeof AUDITED_SALE_FIELDS)[number];

function auditValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value !== null && typeof value === "object") return String(value);
  return value;
}

export function saleAuditSnapshot(sale: Pick<Sale, AuditedSaleField>): Record<string, unknown> {
  return Object.fromEntries(AUDITED_SALE_FIELDS.map((field) => [field, auditValue(sale[field])]));
}

const DOCUMENT_FIELDS = new Set(["cpfCnpj", "accountHolderCpf"]);

function maskDocument(value: unknown): unknown {
  return typeof value === "string" && value ? maskCpfCnpj(value) : value;
}

export function withVisibleHistoryDocuments(diff: Diff | null, canViewDocuments: boolean) {
  if (!diff || canViewDocuments) return diff;
  const visible: Diff = {};
  for (const [field, change] of Object.entries(diff)) {
    visible[field] = DOCUMENT_FIELDS.has(field)
      ? { from: maskDocument(change.from), to: maskDocument(change.to) }
      : change;
  }
  return visible;
}

import type { RawSaleRecord } from "./parser";

export interface ResolveCaches {
  domainValues: Map<string, string>;
  users: Map<string, string>;
  plans: Map<string, string>;
  mappings: Map<string, string>;
}

export interface ResolvedRefs {
  statusId: string | null;
  paymentMethodId: string | null;
  systemId: string | null;
  mailingId: string | null;
  pdvId: string | null;
  sellerId: string | null;
  supervisorId: string | null;
  bkoId: string | null;
  auditorId: string | null;
  planId: string | null;
}

function lookupDomain(caches: ResolveCaches, type: string, text: string | null): string | null {
  if (!text) return null;
  const key = text.toLowerCase();
  return (
    caches.domainValues.get(`${type}|${key}`) ??
    caches.mappings.get(`DOMAIN|${type}|${key}`) ??
    null
  );
}

function lookupUser(caches: ResolveCaches, text: string | null): string | null {
  if (!text) return null;
  const key = text.toLowerCase();
  return caches.users.get(key) ?? caches.mappings.get(`USER||${key}`) ?? null;
}

function lookupPlan(caches: ResolveCaches, text: string | null): string | null {
  if (!text) return null;
  const key = text.toLowerCase();
  return caches.plans.get(key) ?? caches.mappings.get(`PLAN||${key}`) ?? null;
}

export function resolveRecord(
  record: RawSaleRecord,
  caches: ResolveCaches,
): { refs: ResolvedRefs; blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!record.customerName) blockers.push("Campo obrigatório ausente: nome do cliente");
  if (!record.cpfCnpj) blockers.push("Campo obrigatório ausente: CPF/CNPJ");
  if (!record.date) blockers.push("Campo obrigatório ausente: data");
  if (record.amount === null) blockers.push("Campo obrigatório ausente: valor");

  const statusId = lookupDomain(caches, "SALE_STATUS", record.status);
  if (record.status && !statusId) blockers.push(`Status desconhecido: ${record.status}`);
  if (!record.status) blockers.push("Campo obrigatório ausente: status");

  const paymentMethodId = lookupDomain(caches, "PAYMENT_METHOD", record.paymentMethod);
  if (record.paymentMethod && !paymentMethodId) {
    blockers.push(`Forma de pagamento desconhecida: ${record.paymentMethod}`);
  }

  const sellerId = lookupUser(caches, record.seller);
  if (record.seller && !sellerId) blockers.push(`Vendedor desconhecido: ${record.seller}`);
  if (!record.seller) blockers.push("Campo obrigatório ausente: vendedor");

  const internetPlanId = lookupPlan(caches, record.internetPlan);
  if (record.internetPlan && !internetPlanId) {
    blockers.push(`Plano desconhecido: ${record.internetPlan}`);
  }
  const fixedPlanId = lookupPlan(caches, record.fixedPlan);
  if (record.fixedPlan && !fixedPlanId) blockers.push(`Plano desconhecido: ${record.fixedPlan}`);
  if (!record.internetPlan && !record.fixedPlan) {
    blockers.push("Campo obrigatório ausente: plano");
  }
  if (record.internetPlan && record.fixedPlan) {
    blockers.push("Venda com dois planos: escolha um");
  }

  const systemId = lookupDomain(caches, "SYSTEM", record.system);
  if (record.system && !systemId) warnings.push(`Sistema não encontrado: ${record.system}`);
  const mailingId = lookupDomain(caches, "MAILING", record.mailing);
  if (record.mailing && !mailingId) warnings.push(`Mailing não encontrado: ${record.mailing}`);
  const pdvId = lookupDomain(caches, "PDV", record.pdv);
  if (record.pdv && !pdvId) warnings.push(`PDV não encontrado: ${record.pdv}`);

  const supervisorId = lookupUser(caches, record.supervisor);
  if (record.supervisor && !supervisorId) {
    warnings.push(`Supervisor não encontrado: ${record.supervisor}`);
  }
  const bkoId = lookupUser(caches, record.bko);
  if (record.bko && !bkoId) warnings.push(`BKO não encontrado: ${record.bko}`);
  const auditorId = lookupUser(caches, record.auditor);
  if (record.auditor && !auditorId) warnings.push(`Auditor não encontrado: ${record.auditor}`);

  return {
    refs: {
      statusId,
      paymentMethodId,
      systemId,
      mailingId,
      pdvId,
      sellerId,
      supervisorId,
      bkoId,
      auditorId,
      planId: internetPlanId ?? fixedPlanId,
    },
    blockers,
    warnings,
  };
}

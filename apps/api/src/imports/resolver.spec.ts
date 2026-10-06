import { describe, expect, it } from "vitest";
import type { RawSaleRecord } from "./parser";
import { type ResolveCaches, resolveRecord, unresolvedValues } from "./resolver";

const baseRecord: RawSaleRecord = {
  pdv: "PDV PADRÃO",
  bko: "BELTRANA",
  system: "SISTEMA PADRÃO",
  auditor: "CICLANO",
  orderNumber: "1-1000000000001",
  status: "GROSS",
  mailing: "MAILING EXEMPLO",
  seller: "BELTRANA",
  supervisor: "EMPRESA EXEMPLO",
  fixedPlan: null,
  internetPlan: "400 MB",
  dueDay: 20,
  amount: 109.99,
  qty: 1,
  state: "GO",
  city: "APARECIDA DE GOIANIA",
  cpfCnpj: "123.456.789-09",
  date: "2026-06-01",
  customerName: "FULANO DE TAL",
  notes: null,
  phone1: "(62) 98888-1234",
  phone2: null,
  email: null,
  paymentMethod: "BOLETO",
  auditNote: "OK",
  scheduleDate: "2026-06-02",
  schedulePeriod: "10:00 - 12:00",
  installedAt: null,
  brscan: true,
  dateYearAssumed: false,
};

function caches(): ResolveCaches {
  return {
    domainValues: new Map([
      ["SALE_STATUS|gross", "st-1"],
      ["PAYMENT_METHOD|boleto", "pay-1"],
      ["PDV|pdv padrão", "pdv-1"],
      ["SCHEDULE_PERIOD|10:00 - 12:00", "per-1"],
    ]),
    users: new Map([["beltrana souza", "u-vit"]]),
    plans: new Map([["400 mb", "plan-400"]]),
    mappings: new Map([["USER||beltrana", "u-vit"]]),
  };
}

describe("resolveRecord", () => {
  it("resolves refs via direct match and mappings", () => {
    const { refs, blockers } = resolveRecord(baseRecord, caches());
    expect(blockers).toEqual([]);
    expect(refs.statusId).toBe("st-1");
    expect(refs.paymentMethodId).toBe("pay-1");
    expect(refs.pdvId).toBe("pdv-1");
    expect(refs.sellerId).toBe("u-vit");
    expect(refs.planId).toBe("plan-400");
  });

  it("resolves the schedule period", () => {
    const { refs } = resolveRecord(baseRecord, caches());
    expect(refs.schedulePeriodId).toBe("per-1");
  });

  it("warns on an unknown schedule period", () => {
    const { refs, warnings, blockers } = resolveRecord(
      { ...baseRecord, schedulePeriod: "07:00 - 09:00" },
      caches(),
    );
    expect(refs.schedulePeriodId).toBeNull();
    expect(warnings).toContain("Período não encontrado: 07:00 - 09:00");
    expect(blockers).toEqual([]);
  });

  it("blocks a row that fills both plan columns", () => {
    const { blockers } = resolveRecord({ ...baseRecord, fixedPlan: "400 MB" }, caches());
    expect(blockers).toContain("Venda com dois planos: escolha um");
  });

  it("uses the fixed plan when only it is filled", () => {
    const { refs, blockers } = resolveRecord(
      { ...baseRecord, fixedPlan: "400 MB", internetPlan: null },
      caches(),
    );
    expect(blockers).toEqual([]);
    expect(refs.planId).toBe("plan-400");
  });

  it("blocks on unknown status, seller, plan and payment", () => {
    const empty: ResolveCaches = {
      domainValues: new Map(),
      users: new Map(),
      plans: new Map(),
      mappings: new Map(),
    };
    const { blockers } = resolveRecord(baseRecord, empty);
    expect(blockers).toContain("Status desconhecido: GROSS");
    expect(blockers).toContain("Vendedor desconhecido: BELTRANA");
    expect(blockers).toContain("Plano desconhecido: 400 MB");
    expect(blockers).toContain("Forma de pagamento desconhecida: BOLETO");
  });

  it("warns (not blocks) on unknown supervisor and mailing", () => {
    const { refs, blockers, warnings } = resolveRecord(baseRecord, caches());
    expect(blockers).toEqual([]);
    expect(refs.supervisorId).toBeNull();
    expect(refs.systemId).toBeNull();
    expect(warnings).toContain("Supervisor não encontrado: EMPRESA EXEMPLO");
    expect(warnings.some((warning) => /Sistema|PDV/.test(warning))).toBe(false);
    expect(warnings).toContain("Mailing não encontrado: MAILING EXEMPLO");
  });

  it("does not warn about an unknown PDV", () => {
    const { warnings } = resolveRecord({ ...baseRecord, pdv: "PDV DESCONHECIDO" }, caches());
    expect(warnings.some((warning) => warning.includes("PDV"))).toBe(false);
  });

  it("warns when the year was assumed", () => {
    const { warnings } = resolveRecord({ ...baseRecord, dateYearAssumed: true }, caches());
    expect(warnings).toContain("Ano da data presumido: 2026");
  });

  it("blocks on missing essential fields", () => {
    const { blockers } = resolveRecord(
      { ...baseRecord, customerName: null, cpfCnpj: null, date: null, amount: null },
      caches(),
    );
    expect(blockers).toContain("Campo obrigatório ausente: nome do cliente");
    expect(blockers).toContain("Campo obrigatório ausente: CPF/CNPJ");
    expect(blockers).toContain("Campo obrigatório ausente: data");
    expect(blockers).toContain("Campo obrigatório ausente: valor");
  });

  it("does not block payment when the cell is empty", () => {
    const { blockers } = resolveRecord({ ...baseRecord, paymentMethod: null }, caches());
    expect(blockers).toEqual([]);
  });
});

describe("unresolvedValues", () => {
  it("returns nothing when everything resolves", () => {
    const resolved = {
      ...baseRecord,
      supervisor: null,
      mailing: null,
      bko: "BELTRANA",
      auditor: null,
    };
    expect(unresolvedValues(resolved, caches())).toEqual([]);
  });

  it("lists each unresolved reference with its kind, field and blocking flag", () => {
    const result = unresolvedValues(
      {
        ...baseRecord,
        seller: "VENDEDOR X",
        supervisor: "SUPERVISOR X",
        bko: "BKO X",
        auditor: "AUDITOR X",
        internetPlan: "PLANO X",
        fixedPlan: "FIXO X",
        status: "STATUS X",
        paymentMethod: "PAGAMENTO X",
        mailing: "MAILING X",
        schedulePeriod: "PERIODO X",
      },
      caches(),
    );
    expect(result).toEqual([
      {
        kind: "USER",
        domainType: null,
        field: "seller",
        sourceValue: "VENDEDOR X",
        blocking: true,
      },
      {
        kind: "USER",
        domainType: null,
        field: "supervisor",
        sourceValue: "SUPERVISOR X",
        blocking: false,
      },
      { kind: "USER", domainType: null, field: "bko", sourceValue: "BKO X", blocking: false },
      {
        kind: "USER",
        domainType: null,
        field: "auditor",
        sourceValue: "AUDITOR X",
        blocking: false,
      },
      {
        kind: "PLAN",
        domainType: null,
        field: "internetPlan",
        sourceValue: "PLANO X",
        blocking: true,
      },
      { kind: "PLAN", domainType: null, field: "fixedPlan", sourceValue: "FIXO X", blocking: true },
      {
        kind: "DOMAIN",
        domainType: "SALE_STATUS",
        field: "status",
        sourceValue: "STATUS X",
        blocking: true,
      },
      {
        kind: "DOMAIN",
        domainType: "PAYMENT_METHOD",
        field: "paymentMethod",
        sourceValue: "PAGAMENTO X",
        blocking: true,
      },
      {
        kind: "DOMAIN",
        domainType: "MAILING",
        field: "mailing",
        sourceValue: "MAILING X",
        blocking: false,
      },
      {
        kind: "DOMAIN",
        domainType: "SCHEDULE_PERIOD",
        field: "schedulePeriod",
        sourceValue: "PERIODO X",
        blocking: false,
      },
    ]);
  });

  it("resolves through mappings and skips blank source values", () => {
    const result = unresolvedValues(
      {
        ...baseRecord,
        seller: "BELTRANA",
        supervisor: null,
        bko: null,
        auditor: null,
        mailing: null,
      },
      caches(),
    );
    expect(result).toEqual([]);
  });
});

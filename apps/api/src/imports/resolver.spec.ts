import { describe, expect, it } from "vitest";
import type { RawSaleRecord } from "./parser";
import { type ResolveCaches, resolveRecord } from "./resolver";

const baseRecord: RawSaleRecord = {
  pdv: "PDV PADRÃO",
  login: "T1000001",
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

  it("warns (not blocks) on unknown supervisor, system and mailing", () => {
    const { refs, blockers, warnings } = resolveRecord(baseRecord, caches());
    expect(blockers).toEqual([]);
    expect(refs.supervisorId).toBeNull();
    expect(refs.systemId).toBeNull();
    expect(warnings).toContain("Supervisor não encontrado: EMPRESA EXEMPLO");
    expect(warnings).toContain("Sistema não encontrado: SISTEMA PADRÃO");
    expect(warnings).toContain("Mailing não encontrado: MAILING EXEMPLO");
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

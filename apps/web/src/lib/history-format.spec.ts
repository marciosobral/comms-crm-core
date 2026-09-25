import { describe, expect, it } from "vitest";
import { fieldLabels, formatHistoryValue, historyChanges } from "./history-format";

describe("historyChanges", () => {
  it("labels known fields in pt-BR and drops technical ones", () => {
    const changes = historyChanges({
      motherName: { from: null, to: "Beltrana de Tal" },
      auditNote: { from: null, to: "OK" },
      updatedAt: { from: "2026-01-01", to: "2026-01-02" },
      customerId: { from: "a", to: "b" },
    });
    expect(changes).toEqual([
      { field: "motherName", label: "Nome da mãe", from: "-", to: "Beltrana de Tal" },
      { field: "auditNote", label: "Auditoria", from: "-", to: "OK" },
    ]);
  });

  it("returns nothing for an entry without visible changes", () => {
    expect(historyChanges({})).toEqual([]);
    expect(historyChanges(null)).toEqual([]);
  });
});

describe("formatHistoryValue", () => {
  it("formats values the way the screens show them", () => {
    expect(formatHistoryValue("amount", "109.9")).toBe(formatHistoryValue("amount", 109.9));
    expect(formatHistoryValue("phone1", "62985385324")).toBe("(62) 98538-5324");
    expect(formatHistoryValue("birthDate", "1990-01-31")).toBe("31/01/1990");
    expect(formatHistoryValue("dueDay", 10)).toBe("Dia 10");
    expect(formatHistoryValue("brscan", true)).toBe("Aprovado");
    expect(formatHistoryValue("bankAccountType", "SAVINGS")).toBe("Poupança");
  });

  it("turns addresses stored as JSON by older records into readable text", () => {
    const stored = JSON.stringify([
      {
        id: "addr-1",
        customerId: "c1",
        postalCode: "74015010",
        street: "Rua 36",
        number: null,
        noNumber: true,
        complement: null,
        neighborhood: "Setor Sul",
        city: "Goiânia",
        state: "GO",
        createdAt: "2026-09-25T14:38:44.433Z",
      },
    ]);
    const text = formatHistoryValue("addresses", stored);
    expect(text).toContain("Rua 36, S/N");
    expect(text).toContain("Goiânia/GO");
    expect(text).not.toContain("addr-1");
  });
});

describe("fieldLabels", () => {
  it("names changed fields for notifications, ignoring unknown ones", () => {
    expect(fieldLabels(["amount", "dueDay", "updatedAt"])).toEqual(["Valor", "Vencimento"]);
  });
});

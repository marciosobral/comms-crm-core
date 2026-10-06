import { EXPECTED_HEADER, assertHeader, parseCsv } from "@/imports/parser";
import { describe, expect, it } from "vitest";
import { type SaleExportRow, salesToImportCsv } from "./sales-export";

function makeRow(overrides: Partial<SaleExportRow> = {}): SaleExportRow {
  return {
    orderNumber: "OV-1",
    dueDay: 10,
    amount: "1234.5",
    qty: 2,
    date: new Date("2026-05-20"),
    notes: "Cliente pediu retorno",
    auditNote: "Auditoria ok",
    scheduleDate: new Date("2026-06-02"),
    installedAt: new Date("2026-06-05"),
    brscan: true,
    pdv: { value: "PDV PADRÃO" },
    system: { value: "SISTEMA PADRÃO" },
    status: { value: "GROSS" },
    mailing: { value: "MAILING A" },
    paymentMethod: { value: "BOLETO" },
    schedulePeriod: { value: "08:00 - 10:00" },
    seller: { name: "Beltrana Souza", externalReference: "bsouza" },
    supervisor: { name: "Ciclano Lima" },
    bko: { name: "Fulano BKO" },
    auditor: { name: "Fulana Auditora" },
    plan: { name: "Fibra 500", type: { value: "Internet" } },
    address: { city: "Fortaleza", state: "CE" },
    customer: {
      name: "Fulano de Tal",
      cpfCnpj: "12345678909",
      phone1: "85999990000",
      phone2: "abc",
      email: "fulano@example.com",
    },
    ...overrides,
  };
}

function dataRow(csv: string): string[] {
  return parseCsv(csv)[1];
}

function column(row: string[], name: string): string {
  return row[EXPECTED_HEADER.indexOf(name)];
}

describe("salesToImportCsv", () => {
  it("starts with the BOM and the import header, and ends with a newline", () => {
    const csv = salesToImportCsv([makeRow()], { canViewDocument: true });
    expect(csv.startsWith(`﻿${EXPECTED_HEADER.join(";")}\n`)).toBe(true);
    expect(csv.endsWith("\n")).toBe(true);
    expect(csv.split("\n")).toHaveLength(3);
  });

  it("writes only the header for no sales", () => {
    const csv = salesToImportCsv([], { canViewDocument: true });
    expect(csv).toBe(`﻿${EXPECTED_HEADER.join(";")}\n`);
  });

  it("formats every column", () => {
    const row = dataRow(salesToImportCsv([makeRow()], { canViewDocument: true }));
    expect(row).toEqual([
      "PDV PADRÃO",
      "bsouza",
      "Fulano BKO",
      "SISTEMA PADRÃO",
      "Fulana Auditora",
      "OV-1",
      "GROSS",
      "MAILING A",
      "Beltrana Souza",
      "Ciclano Lima",
      "",
      "Fibra 500",
      "10",
      "1.234,50",
      "2",
      "CE",
      "Fortaleza",
      "123.456.789-09",
      "20/05/2026",
      "Fulano de Tal",
      "Cliente pediu retorno",
      "(85) 99999-0000",
      "abc",
      "fulano@example.com",
      "BOLETO",
      "Auditoria ok",
      "02/06/2026 08:00 - 10:00",
      "05/06/2026",
      "SIM",
    ]);
  });

  it("leaves optional columns empty", () => {
    const csv = salesToImportCsv(
      [
        makeRow({
          orderNumber: null,
          dueDay: null,
          scheduleDate: null,
          installedAt: null,
          brscan: null,
          plan: null,
          address: null,
          pdv: null,
          paymentMethod: null,
          customer: {
            name: "Fulano de Tal",
            cpfCnpj: "12345678909",
            phone1: null,
            phone2: null,
            email: null,
          },
        }),
      ],
      { canViewDocument: true },
    );
    const row = dataRow(csv);
    for (const name of [
      "PDV",
      "ORDEM DE VENDA",
      "PLANO FIXO",
      "PLANO INTERNET",
      "VENCIMENTO",
      "UF",
      "CIDADE",
      "CONTATO 1",
      "E-MAIL",
      "FORMA DE PAG",
      "AGENDAMENTO",
      "INSTALAÇÃO",
      "BRScan",
    ]) {
      expect(column(row, name)).toBe("");
    }
  });

  it("writes the schedule date alone when there is no period", () => {
    const row = dataRow(
      salesToImportCsv([makeRow({ schedulePeriod: null })], { canViewDocument: true }),
    );
    expect(column(row, "AGENDAMENTO")).toBe("02/06/2026");
  });

  it("writes BRScan as SIM, NÃO or empty", () => {
    const read = (brscan: boolean | null) =>
      column(dataRow(salesToImportCsv([makeRow({ brscan })], { canViewDocument: true })), "BRScan");
    expect(read(true)).toBe("SIM");
    expect(read(false)).toBe("NÃO");
    expect(read(null)).toBe("");
  });

  it("puts the plan in PLANO FIXO when its type is fixo, ignoring case and accents", () => {
    const row = dataRow(
      salesToImportCsv([makeRow({ plan: { name: "Linha Fixa", type: { value: "FIXO" } } })], {
        canViewDocument: true,
      }),
    );
    expect(column(row, "PLANO FIXO")).toBe("Linha Fixa");
    expect(column(row, "PLANO INTERNET")).toBe("");
  });

  it("masks the document without permission and formats it with permission", () => {
    const masked = dataRow(salesToImportCsv([makeRow()], { canViewDocument: false }));
    expect(column(masked, "CPF/CNPJ")).toBe("123.xxx.x89-09");
    const visible = dataRow(salesToImportCsv([makeRow()], { canViewDocument: true }));
    expect(column(visible, "CPF/CNPJ")).toBe("123.456.789-09");
  });

  it("quotes a cell that contains a semicolon and reads it back", () => {
    const csv = salesToImportCsv([makeRow({ notes: "um; dois" })], { canViewDocument: true });
    expect(csv).toContain('"um; dois"');
    expect(column(dataRow(csv), "OBS")).toBe("um; dois");
  });

  it("is read back by the import parser", () => {
    const csv = salesToImportCsv([makeRow()], { canViewDocument: true });
    const rows = parseCsv(csv);
    expect(() => assertHeader(rows[0])).not.toThrow();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveLength(EXPECTED_HEADER.length);
  });
});

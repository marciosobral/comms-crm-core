import { describe, expect, it } from "vitest";
import {
  assertHeader,
  decodeSpreadsheet,
  dedupeKey,
  normalizeRow,
  parseBRL,
  parseCsv,
  parsePtDate,
  parseSchedule,
  rowHash,
} from "./parser";

const HEADER =
  "PDV;LOGIN;BKO;SISTEMA;AUDITOR;ORDEM DE VENDA;STATUS;MAILING;VENDEDOR;SUPERVISOR;PLANO FIXO;PLANO INTERNET; VENCIMENTO;VALOR;QTD;UF;CIDADE;CPF/CNPJ;DATA;NOME / RAZÃO SOCIAL;OBS;CONTATO 1;CONTATO 2;E-MAIL;FORMA DE PAG;AUDITORIA;AGENDAMENTO;INSTALAÇÃO;BRScan;;;;";

const REAL_LINE =
  "PDV PADRÃO;T1000001;BELTRANA;SISTEMA PADRÃO;CICLANO;1-1000000000001;GROSS;MAILING EXEMPLO;BELTRANA ;EMPRESA EXEMPLO;-;400 MB;20;109,99;1;GO;APARECIDA DE GOIANIA;123.456.789-09;01/jun;FULANO DE TAL;CONCLUÍDA COM SUCESSO;(62) 98888-1234;(62) 97777-5678;cliente@example.com;BOLETO;OK;02/06/2026 10:00 - 12:00;02/06/2026;SIM;;;;";

describe("decodeSpreadsheet", () => {
  it("decodes utf-8 content", () => {
    expect(decodeSpreadsheet(Buffer.from("BELTRANA;ÇÃO", "utf8"))).toBe("BELTRANA;ÇÃO");
  });

  it("falls back to latin-1 when utf-8 is invalid", () => {
    expect(decodeSpreadsheet(Buffer.from("BELTRANA", "latin1"))).toBe("BELTRANA");
  });
});

describe("parseCsv + assertHeader", () => {
  it("splits trimmed cells and skips empty lines", () => {
    const rows = parseCsv(`${HEADER}\n${REAL_LINE}\n;;;;\n`);
    expect(rows).toHaveLength(2);
    expect(rows[0][12]).toBe("VENCIMENTO");
    expect(rows[1][8]).toBe("BELTRANA");
  });

  it("accepts the real header and rejects a wrong one", () => {
    expect(() => assertHeader(parseCsv(HEADER)[0])).not.toThrow();
    expect(() => assertHeader(["NOME", "VALOR"])).toThrow();
  });

  it("rejects a same-length header with one wrong column name", () => {
    const wrong = parseCsv(HEADER)[0].slice();
    wrong[13] = "PREÇO";
    expect(() => assertHeader(wrong)).toThrow();
  });
});

describe("parseBRL", () => {
  it("parses comma decimals and thousand dots", () => {
    expect(parseBRL("109,99")).toBe(109.99);
    expect(parseBRL("1.234,56")).toBe(1234.56);
    expect(parseBRL("119,9")).toBe(119.9);
  });

  it("returns null for empty or dash", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("-")).toBeNull();
  });
});

describe("parsePtDate", () => {
  it("parses dd/mon with the provided year", () => {
    expect(parsePtDate("01/jun", 2026)).toBe("2026-06-01");
    expect(parsePtDate("15/dez", 2026)).toBe("2026-12-15");
  });

  it("parses dd/mm/yyyy directly", () => {
    expect(parsePtDate("02/06/2026", 2026)).toBe("2026-06-02");
  });

  it("returns null for garbage", () => {
    expect(parsePtDate("solto", 2026)).toBeNull();
  });
});

describe("parseSchedule", () => {
  it("parses a date with a time window", () => {
    expect(parseSchedule("02/06/2026 10:00 - 12:00")).toEqual({
      start: "2026-06-02T10:00:00",
      end: "2026-06-02T12:00:00",
    });
  });

  it("parses a bare date as start only", () => {
    expect(parseSchedule("11/06/2026")).toEqual({ start: "2026-06-11T00:00:00", end: null });
  });

  it("returns nulls for empty", () => {
    expect(parseSchedule("")).toEqual({ start: null, end: null });
  });
});

describe("normalizeRow", () => {
  const record = normalizeRow(parseCsv(REAL_LINE)[0], 2026);

  it("normalizes the real line end to end", () => {
    expect(record.pdv).toBe("PDV PADRÃO");
    expect(record.login).toBe("T1000001");
    expect(record.bko).toBe("BELTRANA");
    expect(record.system).toBe("SISTEMA PADRÃO");
    expect(record.auditor).toBe("CICLANO");
    expect(record.orderNumber).toBe("1-1000000000001");
    expect(record.status).toBe("GROSS");
    expect(record.mailing).toBe("MAILING EXEMPLO");
    expect(record.seller).toBe("BELTRANA");
    expect(record.supervisor).toBe("EMPRESA EXEMPLO");
    expect(record.fixedPlan).toBeNull();
    expect(record.internetPlan).toBe("400 MB");
    expect(record.dueDay).toBe(20);
    expect(record.amount).toBe(109.99);
    expect(record.qty).toBe(1);
    expect(record.state).toBe("GO");
    expect(record.city).toBe("APARECIDA DE GOIANIA");
    expect(record.cpfCnpj).toBe("123.456.789-09");
    expect(record.date).toBe("2026-06-01");
    expect(record.customerName).toBe("FULANO DE TAL");
    expect(record.paymentMethod).toBe("BOLETO");
    expect(record.scheduleStart).toBe("2026-06-02T10:00:00");
    expect(record.scheduleEnd).toBe("2026-06-02T12:00:00");
    expect(record.installedAt).toBe("2026-06-02T00:00:00");
    expect(record.brscan).toBe(true);
  });
});

describe("parseCsv invisible characters", () => {
  it("strips BOM and NBSP pollution found in the real spreadsheet", () => {
    const POLLUTED_LINE =
      "PDV PADRÃO;T1000001;BELTRANA;SISTEMA PADRÃO;CICLANO;﻿1-1000000000002;GROSS;MAILING EXEMPLO;BELTRANA ;EMPRESA EXEMPLO;-;400 MB;20;109,99;1;GO;APARECIDA DE GOIANIA;123.456.789-09;01/jun;FULANO DE TAL;CONCLUÍDA COM SUCESSO; (62) 98888-1234;(62) 97777-5678;cliente@example.com;BOLETO;OK;02/06/2026 10:00 - 12:00;02/06/2026;SIM;;;;";
    const cells = parseCsv(POLLUTED_LINE)[0];
    expect(cells[5]).toBe("1-1000000000002");
    expect(cells[21]).toBe("(62) 98888-1234");
    const record = normalizeRow(cells, 2026);
    expect(dedupeKey(record)).toBe("1-1000000000002|123.456.789-09|2026-06-01");
  });
});

describe("rowHash + dedupeKey", () => {
  it("is stable for the same cells and differs when a cell changes", () => {
    const cells = parseCsv(REAL_LINE)[0];
    expect(rowHash(cells)).toBe(rowHash([...cells]));
    const altered = [...cells];
    altered[13] = "119,99";
    expect(rowHash(altered)).not.toBe(rowHash(cells));
  });

  it("builds the composite key from order, cpf and date", () => {
    const record = normalizeRow(parseCsv(REAL_LINE)[0], 2026);
    expect(dedupeKey(record)).toBe("1-1000000000001|123.456.789-09|2026-06-01");
  });
});

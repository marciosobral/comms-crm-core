import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { describe, expect, it } from "vitest";
import {
  assertHeader,
  decodeSpreadsheet,
  dedupeKey,
  hasSaleData,
  normalizeRow,
  parseBRL,
  parseCsv,
  parsePtDate,
  parseSchedule,
  parseSchedulePeriod,
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

describe("parseCsv quoted cells", () => {
  it("keeps semicolons, line breaks and escaped quotes inside quotes", () => {
    const rows = parseCsv('a;"x; y";"line1\nline2";"say ""hi""";z\r\nb;;;;');
    expect(rows).toEqual([
      ["a", "x; y", "line1\nline2", 'say "hi"', "z"],
      ["b", "", "", "", ""],
    ]);
  });

  it("drops fully blank lines and keeps unquoted trimming", () => {
    expect(parseCsv(" a ; b \n;;\n\n")).toEqual([["a", "b"]]);
  });

  it("throws IMPORT_FILE_MALFORMED for unterminated quote", () => {
    expect(() => parseCsv('a;"unterminated')).toThrow(AppException);
  });

  it("throws IMPORT_FILE_MALFORMED with the correct error code", () => {
    let thrownCode: ErrorCode | undefined;
    try {
      parseCsv('a;"unterminated');
    } catch (error) {
      if (error instanceof AppException) {
        thrownCode = error.code;
      }
    }
    expect(thrownCode).toBe(ErrorCode.IMPORT_FILE_MALFORMED);
  });

  it("keeps CRLF inside a quoted cell as one cell", () => {
    const rows = parseCsv('a;"line1\r\nline2";b');
    expect(rows).toEqual([["a", "line1\r\nline2", "b"]]);
  });

  it("strips BOM at the start of a file followed by a quoted cell", () => {
    const rows = parseCsv('﻿"quoted";b');
    expect(rows).toEqual([["quoted", "b"]]);
  });

  it("keeps mid-cell quote literally", () => {
    const rows = parseCsv('ab"c;d');
    expect(rows).toEqual([['ab"c', "d"]]);
  });
});

describe("hasSaleData", () => {
  function line(filled: Record<number, string>): string[] {
    const cells = Array.from({ length: 29 }, () => "");
    for (const [index, value] of Object.entries(filled)) cells[Number(index)] = value;
    return cells;
  }

  it("is false for a pre-filled template line", () => {
    expect(hasSaleData(line({ 0: "BLACK GO", 1: "T1", 3: "TIM VENDAS", 9: "SUPERVISOR X" }))).toBe(
      false,
    );
  });

  it("is false for a line of dashes", () => {
    expect(hasSaleData(Array.from({ length: 29 }, () => "-"))).toBe(false);
  });

  it("is true when any sale column is filled", () => {
    for (const index of [5, 13, 17, 18, 19]) {
      expect(hasSaleData(line({ [index]: "x" }))).toBe(true);
    }
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
  const today = "2026-10-06";

  it("keeps a full date as is", () => {
    expect(parsePtDate("02/06/2025", { today, hint: null })).toEqual({
      date: "2025-06-02",
      yearAssumed: false,
    });
  });

  it("uses the hint year for dd/mon", () => {
    expect(parsePtDate("01/jun", { today, hint: "2025-06-10" })).toEqual({
      date: "2025-06-01",
      yearAssumed: false,
    });
  });

  it("rolls back a year when dd/mon lands after the hint (Dec/Jan)", () => {
    expect(parsePtDate("28/dez", { today, hint: "2027-01-02" })).toEqual({
      date: "2026-12-28",
      yearAssumed: false,
    });
  });

  it("uses the current year without a hint and flags it as assumed", () => {
    expect(parsePtDate("01/jun", { today, hint: null })).toEqual({
      date: "2026-06-01",
      yearAssumed: true,
    });
  });

  it("uses the previous year without a hint when the date is in the future", () => {
    expect(parsePtDate("15/dez", { today, hint: null })).toEqual({
      date: "2025-12-15",
      yearAssumed: true,
    });
  });

  it("returns null for garbage or blank", () => {
    expect(parsePtDate("solto", { today, hint: null })).toEqual({ date: null, yearAssumed: false });
    expect(parsePtDate("-", { today, hint: null })).toEqual({ date: null, yearAssumed: false });
  });

  it("rejects 29/fev with a non-leap hint year", () => {
    expect(parsePtDate("29/fev", { today, hint: "2027-06-10" })).toEqual({
      date: null,
      yearAssumed: false,
    });
  });

  it("rejects explicit 29/02 in a non-leap year", () => {
    expect(parsePtDate("29/02/2027", { today, hint: null })).toEqual({
      date: null,
      yearAssumed: false,
    });
  });

  it("accepts 29/fev with a leap year hint", () => {
    expect(parsePtDate("29/fev", { today, hint: "2028-06-10" })).toEqual({
      date: "2028-02-29",
      yearAssumed: false,
    });
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

describe("parseSchedulePeriod", () => {
  it("splits a date and a time window", () => {
    expect(parseSchedulePeriod("02/06/2026 10:00 - 12:00")).toEqual({
      date: "2026-06-02",
      period: "10:00 - 12:00",
    });
  });

  it("keeps a bare date without period", () => {
    expect(parseSchedulePeriod("11/06/2026")).toEqual({ date: "2026-06-11", period: null });
  });

  it("returns nulls for empty", () => {
    expect(parseSchedulePeriod("")).toEqual({ date: null, period: null });
  });
});

describe("normalizeRow", () => {
  const record = normalizeRow(parseCsv(REAL_LINE)[0], "2026-10-06");

  it("normalizes the real line end to end", () => {
    expect(record.pdv).toBe("PDV PADRÃO");
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
    expect(record.scheduleDate).toBe("2026-06-02");
    expect(record.schedulePeriod).toBe("10:00 - 12:00");
    expect(record.installedAt).toBe("2026-06-02T00:00:00");
    expect(record.brscan).toBe(true);
  });

  it("uses installation date over schedule date as hint and sets yearAssumed to false", () => {
    function line(filled: Record<number, string>): string[] {
      const cells = Array.from({ length: 29 }, () => "");
      for (const [index, value] of Object.entries(filled)) cells[Number(index)] = value;
      return cells;
    }
    const cells = line({
      18: "01/jun",
      26: "02/06/2025 10:00 - 12:00",
      27: "05/06/2026",
    });
    const result = normalizeRow(cells, "2026-10-06");
    expect(result.date).toBe("2026-06-01");
    expect(result.dateYearAssumed).toBe(false);
  });

  it("uses schedule date as hint when installation date is missing and sets yearAssumed to false", () => {
    function line(filled: Record<number, string>): string[] {
      const cells = Array.from({ length: 29 }, () => "");
      for (const [index, value] of Object.entries(filled)) cells[Number(index)] = value;
      return cells;
    }
    const cells = line({
      18: "01/jun",
      26: "02/06/2025 10:00 - 12:00",
    });
    const result = normalizeRow(cells, "2026-10-06");
    expect(result.date).toBe("2025-06-01");
    expect(result.dateYearAssumed).toBe(false);
  });

  it("sets dateYearAssumed to true when no hint exists", () => {
    function line(filled: Record<number, string>): string[] {
      const cells = Array.from({ length: 29 }, () => "");
      for (const [index, value] of Object.entries(filled)) cells[Number(index)] = value;
      return cells;
    }
    const cells = line({ 18: "01/jun" });
    const result = normalizeRow(cells, "2026-10-06");
    expect(result.date).toBe("2026-06-01");
    expect(result.dateYearAssumed).toBe(true);
  });
});

describe("parseCsv invisible characters", () => {
  it("strips BOM and NBSP pollution found in the real spreadsheet", () => {
    const POLLUTED_LINE =
      "PDV PADRÃO;T1000001;BELTRANA;SISTEMA PADRÃO;CICLANO;﻿1-1000000000002;GROSS;MAILING EXEMPLO;BELTRANA ;EMPRESA EXEMPLO;-;400 MB;20;109,99;1;GO;APARECIDA DE GOIANIA;123.456.789-09;01/jun;FULANO DE TAL;CONCLUÍDA COM SUCESSO; (62) 98888-1234;(62) 97777-5678;cliente@example.com;BOLETO;OK;02/06/2026 10:00 - 12:00;02/06/2026;SIM;;;;";
    const cells = parseCsv(POLLUTED_LINE)[0];
    expect(cells[5]).toBe("1-1000000000002");
    expect(cells[21]).toBe("(62) 98888-1234");
    const record = normalizeRow(cells, "2026-10-06");
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
    const record = normalizeRow(parseCsv(REAL_LINE)[0], "2026-10-06");
    expect(dedupeKey(record)).toBe("1-1000000000001|123.456.789-09|2026-06-01");
  });
});

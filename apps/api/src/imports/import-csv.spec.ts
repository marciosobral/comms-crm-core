import { describe, expect, it } from "vitest";
import { pendingCsv, templateCsv } from "./import-csv";
import { EXPECTED_HEADER, assertHeader, parseCsv } from "./parser";

function rawCells(overrides: Record<number, string> = {}): string[] {
  const cells = EXPECTED_HEADER.map(() => "");
  for (const [index, value] of Object.entries(overrides)) cells[Number(index)] = value;
  return cells;
}

describe("templateCsv", () => {
  it("is the template header followed by a newline", () => {
    expect(templateCsv()).toBe(`\uFEFF${EXPECTED_HEADER.join(";")}\n`);
    expect(EXPECTED_HEADER).toHaveLength(29);
  });

  it("is accepted by assertHeader once parsed", () => {
    expect(() => assertHeader(parseCsv(templateCsv())[0])).not.toThrow();
  });
});

describe("pendingCsv", () => {
  it("reads back with the same cells and a valid header", () => {
    const raw = rawCells({
      5: "1-100",
      6: "EM ROTA",
      8: "BELTRANA",
      19: "CLIENTE; UM",
      20: 'disse "oi"',
      13: "-10,50",
    });
    const parsed = parseCsv(pendingCsv([{ raw, message: "Status desconhecido: EM ROTA" }]));
    expect(() => assertHeader(parsed[0])).not.toThrow();
    expect(parsed[0]).toHaveLength(30);
    expect(parsed[0][29]).toBe("MENSAGEM");
    expect(parsed[1].slice(0, 29)).toEqual(raw);
    expect(parsed[1][29]).toBe("Status desconhecido: EM ROTA");
  });

  it("pads short raw rows and keeps an empty message", () => {
    const parsed = parseCsv(pendingCsv([{ raw: ["PDV PADRÃO", "T1"], message: null }]));
    expect(parsed[1]).toHaveLength(30);
    expect(parsed[1].slice(0, 2)).toEqual(["PDV PADRÃO", "T1"]);
    expect(parsed[1].slice(2).every((cell) => cell === "")).toBe(true);
  });

  it("quotes cells with separators, quotes and line breaks", () => {
    const csv = pendingCsv([{ raw: rawCells({ 20: 'a;b "c"\nd' }), message: null }]);
    expect(csv).toContain('"a;b ""c""\nd"');
  });

  it("starts with a UTF-8 BOM", () => {
    expect(pendingCsv([]).startsWith("\uFEFF")).toBe(true);
  });

  it("round-trips formula-guarded cells", () => {
    const raw = rawCells({ 21: "+55 62 99999-0000", 20: "- obs", 24: "=1+1", 22: "@home" });
    const parsed = parseCsv(pendingCsv([{ raw, message: null }]));
    expect(parsed[1].slice(0, 29)).toEqual(raw);
  });

  it("guards formula-looking cells but not negative numbers", () => {
    const csv = pendingCsv([
      { raw: rawCells({ 0: "=SUM(A1)", 1: "+1", 2: "@x", 3: "-abc", 13: "-10" }), message: null },
    ]);
    const line = csv.split("\n")[1];
    expect(line.startsWith("'=SUM(A1);'+1;'@x;'-abc;")).toBe(true);
    expect(parseCsv(csv)[1][13]).toBe("-10");
  });
});

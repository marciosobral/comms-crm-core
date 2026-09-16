import { describe, expect, it } from "vitest";
import { formatBRL, formatDate, formatMoneyInput, parsePrice } from "./format";

describe("formatBRL", () => {
  it("formats a decimal string from the API", () => {
    expect(formatBRL("119.9")).toBe("R$\u{00a0}119,90");
  });

  it("formats a number", () => {
    expect(formatBRL(79.9)).toBe("R$\u{00a0}79,90");
  });
});

describe("formatMoneyInput", () => {
  it("formats a number with thousand separators and cents", () => {
    expect(formatMoneyInput(23_443_224)).toBe("23.443.224,00");
  });

  it("keeps two decimal places", () => {
    expect(formatMoneyInput(119.9)).toBe("119,90");
  });
});

describe("parsePrice", () => {
  it("accepts comma as decimal separator", () => {
    expect(parsePrice("119,90")).toBe(119.9);
  });

  it("accepts dot as decimal separator", () => {
    expect(parsePrice("119.90")).toBe(119.9);
  });

  it("returns NaN for garbage", () => {
    expect(Number.isNaN(parsePrice("abc"))).toBe(true);
  });

  it("parses Brazilian thousands separator", () => {
    expect(parsePrice("1.234,56")).toBe(1234.56);
  });

  it("parses thousand-separated integers as reais", () => {
    expect(parsePrice("1.234")).toBe(1234);
  });
});

describe("formatDate", () => {
  it("formats an ISO date as dd/mm/aaaa in UTC", () => {
    expect(formatDate("2026-06-01T00:00:00.000Z")).toBe("01/06/2026");
  });
});

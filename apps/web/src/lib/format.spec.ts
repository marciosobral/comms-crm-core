import { describe, expect, it } from "vitest";
import { formatBRL, formatDate, formatFileSize, formatMoneyInput } from "./format";

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

describe("formatDate", () => {
  it("formats an ISO date as dd/mm/aaaa in UTC", () => {
    expect(formatDate("2026-06-01T00:00:00.000Z")).toBe("01/06/2026");
  });
});

describe("formatFileSize", () => {
  it("shows kilobytes, at least 1", () => {
    expect(formatFileSize(10)).toBe("1 KB");
    expect(formatFileSize(15_478)).toBe("15 KB");
  });

  it("shows megabytes with one decimal", () => {
    expect(formatFileSize(1_572_864)).toBe("1.5 MB");
  });
});

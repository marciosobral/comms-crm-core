import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatBRL,
  formatDate,
  formatFileSize,
  formatInstantDate,
  formatInstantDateTime,
  formatLastAccess,
  formatMoneyInput,
} from "./format";

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

describe("business timezone formatting", () => {
  it("formats instants in the business timezone", () => {
    expect(formatInstantDate("2026-10-07T01:30:00Z")).toBe("06/10/2026");
    expect(formatInstantDateTime("2026-10-07T01:30:00Z")).toBe("06/10/2026 22:30");
  });

  it("formats instants in the business timezone when the process runs in UTC", () => {
    const previousZone = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      expect(formatInstantDate("2026-10-07T01:30:00Z")).toBe("06/10/2026");
      expect(formatInstantDateTime("2026-10-07T01:30:00Z")).toBe("06/10/2026 22:30");
    } finally {
      process.env.TZ = previousZone ?? "America/Sao_Paulo";
    }
  });

  it("keeps date-only values on their day", () => {
    expect(formatDate("2026-10-01")).toBe("01/10/2026");
  });
});

describe("formatLastAccess", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels business days relative to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T01:30:00Z"));
    expect(formatLastAccess("2026-10-06T23:00:00Z")).toMatch(/^Hoje/);
    expect(formatLastAccess("2026-10-06T02:00:00Z")).toMatch(/^Ontem/);
    expect(formatLastAccess("2026-10-01T15:00:00Z")).toBe("01/10/2026");
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

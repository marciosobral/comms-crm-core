import { describe, expect, it } from "vitest";
import { revenueReferenceDate } from "./reports.service";

describe("revenueReferenceDate", () => {
  it("uses the requested period end as the KPI month", () => {
    const date = revenueReferenceDate("2026-07-31");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(31);
  });

  it("falls back to now when to is omitted", () => {
    const now = new Date(2026, 8, 16);
    expect(revenueReferenceDate(undefined, now)).toBe(now);
  });
});

import { describe, expect, it } from "vitest";
import { aggregateRevenue } from "./revenue";

const now = new Date(2026, 7, 30); // ago/2026

function sale(amount: string, iso: string, canceled = false) {
  return { amount, date: new Date(iso), canceledAt: canceled ? new Date(iso) : null };
}

describe("aggregateRevenue", () => {
  it("sums only non-canceled sales and computes ticket and conversion", () => {
    const result = aggregateRevenue(
      [sale("100", "2026-08-10"), sale("50.5", "2026-08-12"), sale("999", "2026-08-13", true)],
      now,
    );
    expect(result.totalAmount).toBe(150.5);
    expect(result.monthAmount).toBe(150.5);
    expect(result.avgTicket).toBe(75.25);
    expect(result.conversionRate).toBeCloseTo(2 / 3, 5);
  });

  it("builds a six month series with zeros for empty months", () => {
    const result = aggregateRevenue([sale("100", "2026-06-05")], now);
    expect(result.monthlySeries).toHaveLength(6);
    expect(result.monthlySeries[0].month).toBe("2026-03");
    expect(result.monthlySeries[5].month).toBe("2026-08");
    expect(result.monthlySeries.find((entry) => entry.month === "2026-06")?.total).toBe(100);
    expect(result.monthlySeries[5].total).toBe(0);
  });

  it("returns zeros for an empty period", () => {
    const result = aggregateRevenue([], now);
    expect(result).toMatchObject({
      totalAmount: 0,
      monthAmount: 0,
      avgTicket: 0,
      conversionRate: 0,
    });
  });
});

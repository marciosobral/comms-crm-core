import { describe, expect, it } from "vitest";
import { aggregateRevenue, aggregateRevenueByPlan } from "./revenue";

const now = new Date(2026, 7, 30); // ago/2026

function sale(amount: string, iso: string, canceled = false) {
  return { amount, date: new Date(iso), canceledAt: canceled ? new Date(iso) : null };
}

function planSale(amount: string, iso: string, planName: string | null, canceled = false) {
  return { amount, date: new Date(iso), canceledAt: canceled ? new Date(iso) : null, planName };
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

  it("computes kpi deltas comparing current and previous month", () => {
    const result = aggregateRevenue(
      [
        sale("100", "2026-08-10"),
        sale("50", "2026-08-12"),
        sale("999", "2026-08-13", true),
        sale("80", "2026-07-05"),
      ],
      now,
    );
    expect(result.kpiDeltas.revenue).toEqual({ current: 150, previous: 80, deltaPct: 87.5 });
    expect(result.kpiDeltas.salesCount).toEqual({ current: 2, previous: 1, deltaPct: 100 });
    expect(result.kpiDeltas.avgTicket).toEqual({ current: 75, previous: 80, deltaPct: -6.25 });
    expect(result.kpiDeltas.conversionRate.current).toBeCloseTo(2 / 3, 5);
    expect(result.kpiDeltas.conversionRate.previous).toBe(1);
  });

  it("compares the given month, not calendar now", () => {
    const july = new Date(2026, 6, 31);
    const result = aggregateRevenue(
      [sale("100", "2026-07-10"), sale("40", "2026-06-05"), sale("999", "2026-08-10")],
      july,
    );
    expect(result.monthAmount).toBe(100);
    expect(result.kpiDeltas.revenue).toEqual({ current: 100, previous: 40, deltaPct: 150 });
    expect(result.monthlySeries.map((entry) => entry.month)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  it("returns a 0% delta when both current and previous periods are empty", () => {
    const result = aggregateRevenue([], now);
    expect(result.kpiDeltas.revenue).toEqual({ current: 0, previous: 0, deltaPct: 0 });
  });

  it("returns a 100% delta when previous period is zero but current is not", () => {
    const result = aggregateRevenue([sale("100", "2026-08-10")], now);
    expect(result.kpiDeltas.revenue.deltaPct).toBe(100);
  });
});

describe("aggregateRevenueByPlan", () => {
  it("groups non-canceled current month revenue by plan", () => {
    const result = aggregateRevenueByPlan(
      [
        planSale("100", "2026-08-10", "Plano A"),
        planSale("50", "2026-08-11", "Plano A"),
        planSale("30", "2026-08-12", "Plano B"),
        planSale("999", "2026-08-13", "Plano A", true),
        planSale("40", "2026-07-01", "Plano A"),
      ],
      now,
    );
    expect(result).toEqual([
      { planName: "Plano A", count: 2, total: 150 },
      { planName: "Plano B", count: 1, total: 30 },
    ]);
  });

  it("falls back to a placeholder name when the sale has no plan", () => {
    const result = aggregateRevenueByPlan([planSale("100", "2026-08-10", null)], now);
    expect(result).toEqual([{ planName: "Sem plano", count: 1, total: 100 }]);
  });

  it("returns an empty list for a period with no sales", () => {
    expect(aggregateRevenueByPlan([], now)).toEqual([]);
  });
});

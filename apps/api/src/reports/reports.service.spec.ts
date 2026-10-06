import { describe, expect, it, vi } from "vitest";
import { ReportsService, revenueReferenceMonth } from "./reports.service";

describe("revenueReferenceMonth", () => {
  it("uses the requested period end as the KPI month", () => {
    expect(revenueReferenceMonth("2026-07-31")).toBe("2026-07");
  });

  it("falls back to the business month when to is omitted", () => {
    // 23:00 on 31/07 in Sao Paulo
    expect(revenueReferenceMonth(undefined, new Date("2026-08-01T02:00:00Z"))).toBe("2026-07");
  });

  it("falls back to the business month when to is invalid", () => {
    expect(revenueReferenceMonth("nope", new Date("2026-08-01T02:00:00Z"))).toBe("2026-07");
  });
});

function makeService() {
  const findMany = vi.fn().mockResolvedValue([]);
  const prisma = { sale: { findMany } };
  const service = new ReportsService(
    prisma as unknown as ConstructorParameters<typeof ReportsService>[0],
  );
  return { service, findMany };
}

const seller = {
  id: "u1",
  isSuperAdmin: false,
  status: "ACTIVE",
  role: { permissions: ["reports.view", "reports.export"] },
};
const manager = {
  ...seller,
  id: "u2",
  role: { permissions: ["reports.view", "reports.export", "sales.view_all"] },
};

describe("ReportsService sale scoping", () => {
  it.each([
    ["revenue", (s: ReportsService) => s.revenue(seller, "2026-07-01", "2026-07-31")],
    ["revenueCsv", (s: ReportsService) => s.revenueCsv(seller, "2026-07-01", "2026-07-31")],
  ])("%s limits a seller without sales.view_all to own sales", async (_name, run) => {
    const { service, findMany } = makeService();
    await run(service);
    const { where } = findMany.mock.calls[0][0];
    expect(where.sellerId).toBe("u1");
    expect(where.date).toBeDefined();
  });

  it.each([
    ["revenue", (s: ReportsService) => s.revenue(manager, "2026-07-01", "2026-07-31")],
    ["revenueCsv", (s: ReportsService) => s.revenueCsv(manager, "2026-07-01", "2026-07-31")],
  ])("%s does not filter by seller with sales.view_all", async (_name, run) => {
    const { service, findMany } = makeService();
    await run(service);
    const { where } = findMany.mock.calls[0][0];
    expect(where).not.toHaveProperty("sellerId");
    expect(where.date).toBeDefined();
  });
});

describe("ReportsService dateBy", () => {
  it.each([
    [
      "revenue",
      (s: ReportsService) => s.revenue(manager, "2026-10-01", "2026-10-31", "installation"),
    ],
    [
      "revenueCsv",
      (s: ReportsService) => s.revenueCsv(manager, "2026-10-01", "2026-10-31", "installation"),
    ],
  ])("%s filters by the installation date", async (_name, run) => {
    const { service, findMany } = makeService();
    await run(service);
    const { where } = findMany.mock.calls[0][0];
    expect(where.installedAt).toBeDefined();
    expect(where.date).toBeUndefined();
  });

  it("buckets revenue by the installation date", async () => {
    const { service, findMany } = makeService();
    findMany.mockResolvedValue([
      {
        amount: "100",
        date: new Date("2026-09-28"),
        installedAt: new Date("2026-10-02"),
        canceledAt: null,
        plan: null,
      },
    ]);
    const result = await service.revenue(manager, "2026-05-01", "2026-10-31", "installation");
    expect(result.monthAmount).toBe(100);
    expect(result.monthlySeries.at(-1)).toEqual({ month: "2026-10", total: 100 });
  });

  it("buckets revenue by the sale date by default", async () => {
    const { service, findMany } = makeService();
    findMany.mockResolvedValue([
      {
        amount: "100",
        date: new Date("2026-09-28"),
        installedAt: new Date("2026-10-02"),
        canceledAt: null,
        plan: null,
      },
    ]);
    const result = await service.revenue(manager, "2026-05-01", "2026-10-31");
    expect(result.monthAmount).toBe(0);
    expect(result.monthlySeries.find((entry) => entry.month === "2026-09")?.total).toBe(100);
  });
});

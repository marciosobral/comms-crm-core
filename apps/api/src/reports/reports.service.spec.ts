import { describe, expect, it, vi } from "vitest";
import { ReportsService, revenueReferenceDate } from "./reports.service";

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

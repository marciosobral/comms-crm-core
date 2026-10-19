import { DEMO_PROFILES, DEMO_PROFILE_KEYS } from "@/demo/demo-profiles";
import { isCpfCnpj } from "@comms-crm-core/validation";
import { describe, expect, it } from "vitest";
import { buildDemoDataset } from "./dataset";

const OPTIONS = {
  now: new Date("2026-10-19T15:00:00.000Z"),
  defaultPdv: "PDV PADRÃO",
  defaultSystem: "SISTEMA PADRÃO",
};
const TODAY = new Date("2026-10-19T00:00:00.000Z");
const DAY_MS = 86_400_000;

const data = buildDemoDataset(OPTIONS);

function domainId(type: string, value: string): string | undefined {
  return data.domainValues.find((row) => row.type === type && row.value === value)?.id;
}

function dueDatePayload(payload: unknown): { dueDay: number; count: number; scope: string } {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "dueDay" in payload &&
    "count" in payload &&
    "scope" in payload &&
    typeof payload.dueDay === "number" &&
    typeof payload.count === "number" &&
    typeof payload.scope === "string"
  ) {
    return { dueDay: payload.dueDay, count: payload.count, scope: payload.scope };
  }
  throw new Error("unexpected due date payload");
}

describe("buildDemoDataset", () => {
  it("has the agreed volume", () => {
    expect(data.sales).toHaveLength(300);
    expect(data.customers).toHaveLength(200);
    const sellerRole = data.roles.find((role) => role.name === DEMO_PROFILES.seller.label);
    expect(data.users.filter((user) => user.roleId === sellerRole?.id)).toHaveLength(8);
    expect(data.domainValues.filter((row) => row.type === "PDV")).toHaveLength(2);
  });

  it("is the same for the same day", () => {
    expect(buildDemoDataset(OPTIONS)).toEqual(data);
  });

  it("covers the last six months up to today", () => {
    const dates = data.sales.map((sale) => new Date(sale.date).getTime());
    expect(Math.max(...dates)).toBeLessThanOrEqual(TODAY.getTime());
    expect(Math.min(...dates)).toBeGreaterThanOrEqual(TODAY.getTime() - 180 * DAY_MS);
    const months = new Set(data.sales.map((sale) => new Date(sale.date).toISOString().slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(6);
  });

  it("follows the build day", () => {
    const later = buildDemoDataset({ ...OPTIONS, now: new Date("2026-11-19T15:00:00.000Z") });
    const latest = Math.max(...later.sales.map((sale) => new Date(sale.date).getTime()));
    expect(latest).toBeGreaterThan(TODAY.getTime());
  });

  it("never gives a generated user the super admin flag", () => {
    for (const user of data.users) expect(user.isSuperAdmin ?? false).toBe(false);
  });

  it("puts every sale on the default PDV", () => {
    const defaultPdvId = domainId("PDV", "PDV PADRÃO");
    for (const sale of data.sales) expect(sale.pdvId).toBe(defaultPdvId);
  });

  it("only holds fictional contact data", () => {
    for (const user of data.users) expect(user.email).toMatch(/@example\.com$/);
    for (const customer of data.customers) {
      expect(customer.email).toMatch(/@example\.com$/);
      expect(isCpfCnpj(customer.cpfCnpj)).toBe(true);
    }
    expect(new Set(data.customers.map((customer) => customer.cpfCnpj)).size).toBe(200);
  });

  it("keeps every amount inside its plan's range", () => {
    for (const sale of data.sales) {
      const plan = data.plans.find((row) => row.id === sale.planId);
      expect(Number(sale.amount)).toBeGreaterThanOrEqual(Number(plan?.minPrice));
      expect(Number(sale.amount)).toBeLessThanOrEqual(Number(plan?.basePrice));
    }
  });

  it("gives every demo profile an active user with its role", () => {
    for (const key of DEMO_PROFILE_KEYS) {
      const user = data.users.find((row) => row.email === DEMO_PROFILES[key].email);
      const role = data.roles.find((row) => row.id === user?.roleId);
      expect(user?.status).toBe("ACTIVE");
      expect(role?.name).toBe(DEMO_PROFILES[key].label);
    }
  });

  it("includes the configured default PDV and system", () => {
    expect(domainId("PDV", "PDV PADRÃO")).toBeDefined();
    expect(domainId("SYSTEM", "SISTEMA PADRÃO")).toBeDefined();
  });

  it("starts every sale as GROSS and records later changes", () => {
    const created = data.auditLogs.filter((log) => log.action === "CREATE");
    expect(created).toHaveLength(300);
    const grossId = domainId("SALE_STATUS", "GROSS");
    for (const log of created) {
      expect(log.diff).toMatchObject({ statusId: { from: null, to: grossId } });
    }
    const changed = data.sales.filter((sale) => sale.statusId !== grossId);
    for (const sale of changed) {
      expect(
        data.auditLogs.some((log) => log.entityId === sale.id && log.action === "UPDATE"),
      ).toBe(true);
    }
    expect(data.sales.some((sale) => sale.statusId === grossId && sale.installedAt)).toBe(true);
    expect(data.sales.some((sale) => sale.statusId !== grossId && sale.installedAt)).toBe(true);
    const canceledId = domainId("SALE_STATUS", "CANCELADA");
    const canceled = data.sales.filter((sale) => sale.statusId === canceledId);
    expect(canceled.length).toBeGreaterThan(0);
    for (const sale of canceled) {
      expect(sale.cancelReason).toBeTruthy();
      expect(
        data.auditLogs.some((log) => log.entityId === sale.id && log.action === "UPDATE"),
      ).toBe(true);
    }
  });

  it("ships notifications for the manager, supervisor and seller", () => {
    for (const key of ["manager", "supervisor", "seller"] as const) {
      const user = data.users.find((row) => row.email === DEMO_PROFILES[key].email);
      expect(data.notifications.some((row) => row.userId === user?.id)).toBe(true);
    }
  });

  it("announces a due day that matches the generated sales", () => {
    const sellerId = data.users.find((row) => row.email === DEMO_PROFILES.seller.email)?.id;
    const canceledId = domainId("SALE_STATUS", "CANCELADA");
    const dueNotifications = data.notifications.filter((row) => row.type === "DUE_DATE");
    expect(dueNotifications).toHaveLength(2);
    for (const row of dueNotifications) {
      const payload = dueDatePayload(row.payload);
      expect([5, 10, 15, 20]).toContain(payload.dueDay);
      const expected = data.sales.filter(
        (sale) =>
          sale.dueDay === payload.dueDay &&
          sale.statusId !== canceledId &&
          (payload.scope !== "own" || sale.sellerId === sellerId),
      ).length;
      expect(payload.count).toBe(expected);
      expect(payload.count).toBeGreaterThan(0);
      expect(new Date(row.createdAt ?? 0).getTime()).toBeLessThanOrEqual(OPTIONS.now.getTime());
    }
  });

  it("never dates a notification after the build instant", () => {
    const early = { ...OPTIONS, now: new Date("2026-10-19T09:00:00.000Z") };
    for (const row of buildDemoDataset(early).notifications) {
      expect(new Date(row.createdAt ?? 0).getTime()).toBeLessThanOrEqual(early.now.getTime());
    }
  });

  it("has one finished import batch linked to existing sales", () => {
    expect(data.importBatches).toHaveLength(1);
    const saleIds = new Set(data.sales.map((sale) => sale.id));
    for (const row of data.importRows) {
      expect(row.status).toBe("CREATED");
      expect(saleIds.has(row.saleId ?? "")).toBe(true);
    }
  });
});

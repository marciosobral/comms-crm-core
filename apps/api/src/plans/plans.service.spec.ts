import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { PlansService } from "./plans.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

const baseDto = {
  name: "Combo Fibra 600MB",
  type: "COMBO" as const,
  speed: "600 Mbps",
  features: ["Wi-Fi 6 incluso"],
  basePrice: 119.9,
  minPrice: 79.9,
  salesScript: "Bom dia!",
};

function makeService(overrides: { existingPlan?: { id: string; name: string } | null } = {}) {
  const prisma = {
    plan: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(overrides.existingPlan ?? null),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "p1", ...baseDto, active: true }),
      create: vi.fn().mockResolvedValue({ id: "p1", ...baseDto, active: true }),
      update: vi.fn().mockResolvedValue({ id: "p1", ...baseDto, active: false }),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new PlansService(
    prisma as unknown as ConstructorParameters<typeof PlansService>[0],
    audit as unknown as ConstructorParameters<typeof PlansService>[1],
  );
  return { svc, prisma, audit };
}

describe("PlansService.create", () => {
  it("rejects minPrice above basePrice", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, minPrice: 129.9 }, ctx)).rejects.toThrow(AppException);
  });

  it("accepts minPrice equal to basePrice", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, minPrice: 119.9 }, ctx)).resolves.toBeDefined();
  });

  it("rejects duplicate name", async () => {
    const { svc } = makeService({ existingPlan: { id: "other", name: "Combo Fibra 600MB" } });
    await expect(svc.create(baseDto, ctx)).rejects.toThrow(AppException);
  });

  it("records an audit entry on create", async () => {
    const { svc, audit } = makeService();
    await svc.create(baseDto, ctx);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Plan", action: "CREATE" }),
    );
  });
});

describe("PlansService.update", () => {
  it("rejects a partial update that would invert the price range", async () => {
    const { svc } = makeService();
    await expect(svc.update("p1", { minPrice: 200 }, ctx)).rejects.toThrow(AppException);
  });
});

describe("PlansService.setActive", () => {
  it("deactivates and audits", async () => {
    const { svc, audit } = makeService();
    const result = await svc.setActive("p1", false, ctx);
    expect(result.active).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Plan", action: "UPDATE" }),
    );
  });
});

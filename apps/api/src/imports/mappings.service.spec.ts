import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { MappingsService } from "./mappings.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

function makeService(overrides: { targetExists?: boolean; duplicate?: boolean } = {}) {
  const prisma = {
    importMapping: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(overrides.duplicate ? { id: "m-existing" } : null),
      create: vi
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: "m-1", ...args.data }),
        ),
    },
    user: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides.targetExists === false ? null : { id: "u-vit", name: "Beltrana" },
        ),
    },
    domainValue: { findUnique: vi.fn().mockResolvedValue({ id: "dv-1", value: "example" }) },
    plan: { findUnique: vi.fn().mockResolvedValue({ id: "p-1", name: "Plan Name" }) },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new MappingsService(
    prisma as unknown as ConstructorParameters<typeof MappingsService>[0],
    audit as unknown as ConstructorParameters<typeof MappingsService>[1],
  );
  return { svc, prisma, audit };
}

describe("MappingsService.create", () => {
  it("normalizes sourceValue to lowercase/trim and audits", async () => {
    const { svc, prisma, audit } = makeService();
    await svc.create({ kind: "USER", sourceValue: "  BELTRANA  ", targetId: "u-vit" }, ctx);
    expect(prisma.importMapping.create.mock.calls[0][0].data.sourceValue).toBe("beltrana");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "ImportMapping", action: "CREATE" }),
    );
  });

  it("rejects an unknown target", async () => {
    const { svc } = makeService({ targetExists: false });
    await expect(
      svc.create({ kind: "USER", sourceValue: "x", targetId: "nope" }, ctx),
    ).rejects.toThrow(AppException);
  });

  it("rejects a duplicate mapping", async () => {
    const { svc } = makeService({ duplicate: true });
    await expect(
      svc.create({ kind: "USER", sourceValue: "beltrana", targetId: "u-vit" }, ctx),
    ).rejects.toThrow(AppException);
  });
});

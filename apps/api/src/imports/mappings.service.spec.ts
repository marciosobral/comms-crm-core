import { AppException } from "@/logging/app-exception";
import { describe, expect, it, vi } from "vitest";
import { MappingsService } from "./mappings.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

function makeService(
  overrides: {
    targetExists?: boolean;
    duplicate?: boolean;
    missingMapping?: boolean;
    deleteRace?: boolean;
  } = {},
) {
  const prisma = {
    importMapping: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides.missingMapping
            ? null
            : { id: "m-1", kind: "USER", sourceValue: "x", targetId: "u-vit" },
        ),
      deleteMany: vi.fn().mockResolvedValue({ count: overrides.deleteRace ? 0 : 1 }),
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

describe("MappingsService.remove", () => {
  it("deletes the mapping and audits the previous state", async () => {
    const { svc, prisma, audit } = makeService();
    await svc.remove("m-1", ctx);
    expect(prisma.importMapping.deleteMany).toHaveBeenCalledWith({ where: { id: "m-1" } });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "ImportMapping",
        entityId: "m-1",
        action: "DELETE",
        before: expect.objectContaining({ id: "m-1" }),
      }),
    );
  });

  it("rejects an unknown mapping", async () => {
    const { svc, prisma } = makeService({ missingMapping: true });
    await expect(svc.remove("nope", ctx)).rejects.toThrow(AppException);
    expect(prisma.importMapping.deleteMany).not.toHaveBeenCalled();
  });
});

describe("MappingsService.remove race", () => {
  it("rejects without auditing when the mapping vanished before the delete", async () => {
    const { svc, audit } = makeService({ deleteRace: true });
    await expect(svc.remove("m-1", ctx)).rejects.toThrow(AppException);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

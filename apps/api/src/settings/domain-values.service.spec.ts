import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { DomainValuesService } from "./domain-values.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

function makeService(overrides: { maxOrder?: number | null } = {}) {
  const prisma = {
    domainValue: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _max: { order: overrides.maxOrder ?? null } }),
      create: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: "new", ...data }),
        ),
      update: vi
        .fn()
        .mockImplementation(({ where, data }: { where: { id: string }; data: object }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new DomainValuesService(
    prisma as unknown as ConstructorParameters<typeof DomainValuesService>[0],
    audit as unknown as ConstructorParameters<typeof DomainValuesService>[1],
  );
  return { svc, prisma, audit };
}

describe("DomainValuesService.create", () => {
  it("places a new value after the current max order for that type", async () => {
    const { svc, prisma } = makeService({ maxOrder: 4 });
    await svc.create({ type: "PDV", value: "NOVO PDV" }, ctx);
    expect(prisma.domainValue.aggregate).toHaveBeenCalledWith({
      where: { type: "PDV" },
      _max: { order: true },
    });
    expect(prisma.domainValue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "PDV", value: "NOVO PDV", order: 5 }),
    });
  });

  it("starts at 1 when the type has no values yet", async () => {
    const { svc, prisma } = makeService({ maxOrder: null });
    await svc.create({ type: "MAILING", value: "PRIMEIRO" }, ctx);
    expect(prisma.domainValue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ order: 1 }),
    });
  });
});

describe("DomainValuesService.reorder", () => {
  it("rewrites order as 1..n in the given sequence", async () => {
    const { svc, prisma } = makeService();
    prisma.domainValue.findMany.mockResolvedValue([
      { id: "a", type: "SYSTEM", order: 1 },
      { id: "b", type: "SYSTEM", order: 2 },
      { id: "c", type: "SYSTEM", order: 3 },
    ]);
    await svc.reorder("SYSTEM", ["c", "a", "b"], ctx);
    expect(prisma.domainValue.update).toHaveBeenCalledWith({
      where: { id: "c" },
      data: { order: 1 },
    });
    expect(prisma.domainValue.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { order: 2 },
    });
    expect(prisma.domainValue.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { order: 3 },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("rejects a list that is not a permutation of the type", async () => {
    const { svc, prisma } = makeService();
    prisma.domainValue.findMany.mockResolvedValue([
      { id: "a", type: "PDV", order: 1 },
      { id: "b", type: "PDV", order: 2 },
    ]);
    await expect(svc.reorder("PDV", ["a"], ctx)).rejects.toThrow(AppException);
    await expect(svc.reorder("PDV", ["a", "x"], ctx)).rejects.toThrow(AppException);
  });
});

import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { assertEligible, assignablePeople } from "./sale-people";

function makePrisma({ configuredRoles, matches }: { configuredRoles: number; matches: number }) {
  return {
    role: { count: vi.fn().mockResolvedValue(configuredRoles) },
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: "u1", name: "Fulano de Tal" }]),
      count: vi.fn().mockResolvedValue(matches),
    },
  };
}

type Prisma = Parameters<typeof assignablePeople>[0];

describe("assignablePeople", () => {
  it("lists every active non-admin user while no role has the function", async () => {
    const prisma = makePrisma({ configuredRoles: 0, matches: 1 });
    await assignablePeople(prisma as unknown as Prisma);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ status: "ACTIVE", isSuperAdmin: false });
  });

  it("limits the list to roles with the function once one is configured", async () => {
    const prisma = makePrisma({ configuredRoles: 1, matches: 1 });
    const people = await assignablePeople(prisma as unknown as Prisma);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toEqual({ active: true, saleFunctions: { has: "SELLER" } });
    expect(Object.keys(people)).toEqual(["SELLER", "SUPERVISOR", "BKO", "AUDITOR"]);
  });
});

describe("assertEligible", () => {
  it("rejects someone whose role does not have the function", async () => {
    const prisma = makePrisma({ configuredRoles: 1, matches: 0 });
    await expect(assertEligible(prisma as unknown as Prisma, "BKO", "u9")).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it("accepts someone whose role has the function", async () => {
    const prisma = makePrisma({ configuredRoles: 1, matches: 1 });
    await expect(assertEligible(prisma as unknown as Prisma, "BKO", "u1")).resolves.toBeUndefined();
  });
});

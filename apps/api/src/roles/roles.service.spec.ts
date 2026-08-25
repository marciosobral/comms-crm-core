import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { PermissionsService } from "../permissions/permissions.service";
import { RolesService } from "./roles.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

function makeService(
  overrides: {
    roleUsers?: number;
    existingRole?: { id: string; name: string; permissions: string[] } | null;
  } = {},
) {
  const prisma = {
    role: {
      create: vi
        .fn()
        .mockResolvedValue({ id: "r1", name: "Vendedor", permissions: ["sales.create"] }),
      update: vi.fn().mockResolvedValue({ id: "r1", name: "Vendedor", permissions: [] }),
      delete: vi.fn().mockResolvedValue({ id: "r1" }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(overrides.existingRole ?? null),
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue({ id: "r1", name: "Vendedor", permissions: ["sales.create"] }),
    },
    user: { count: vi.fn().mockResolvedValue(overrides.roleUsers ?? 0) },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new RolesService(
    prisma as unknown as ConstructorParameters<typeof RolesService>[0],
    new PermissionsService(),
    audit as unknown as ConstructorParameters<typeof RolesService>[2],
  );
  return { svc, prisma, audit };
}

describe("RolesService", () => {
  it("rejects unknown permission keys on create", async () => {
    const { svc } = makeService();
    await expect(svc.create({ name: "X", permissions: ["nope.nope"] }, ctx)).rejects.toThrow(
      AppException,
    );
  });

  it("creates role and records audit", async () => {
    const { svc, audit } = makeService();
    await svc.create({ name: "Vendedor", permissions: ["sales.create"] }, ctx);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Role", action: "CREATE" }),
    );
  });

  it("refuses to delete role with users", async () => {
    const { svc } = makeService({ roleUsers: 2 });
    await expect(svc.remove("r1", ctx)).rejects.toThrow(AppException);
  });

  it("rejects duplicate name on create", async () => {
    const { svc } = makeService({
      existingRole: { id: "r1", name: "Vendedor", permissions: [] },
    });
    await expect(
      svc.create({ name: "Vendedor", permissions: ["sales.create"] }, ctx),
    ).rejects.toThrow(AppException);
  });

  it("rejects update to a name owned by another role", async () => {
    const { svc } = makeService({
      existingRole: { id: "r2", name: "Gerente", permissions: [] },
    });
    await expect(svc.update("r1", { name: "Gerente" }, ctx)).rejects.toThrow(AppException);
  });
});

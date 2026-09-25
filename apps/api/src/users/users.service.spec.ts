import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { UsersService } from "./users.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

const baseDto = {
  name: "Ciclano de Tal",
  email: "ciclano@example.com",
  cpf: "12345678909",
  password: "senha123",
  roleId: "r1",
};

function makeService(
  overrides: {
    emailTaken?: boolean;
    cpfTaken?: boolean;
    roleExists?: boolean;
    existingEmail?: string;
  } = {},
) {
  const created = {
    id: "u2",
    name: baseDto.name,
    email: overrides.existingEmail ?? baseDto.email,
    cpf: baseDto.cpf,
    status: "ACTIVE",
    roleId: "r1",
    isSuperAdmin: false,
    reference: "0001",
  };
  const prisma = {
    user: {
      findMany: vi.fn().mockResolvedValue([created]),
      findFirst: vi.fn().mockImplementation((args: { where: { email?: string; cpf?: string } }) => {
        if (args.where.email && overrides.emailTaken) return Promise.resolve({ id: "other" });
        if (args.where.cpf && overrides.cpfTaken) return Promise.resolve({ id: "other" });
        return Promise.resolve(null);
      }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(created),
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn().mockResolvedValue({ ...created, status: "INACTIVE" }),
    },
    credential: {
      update: vi.fn().mockResolvedValue({}),
    },
    role: {
      findUnique: vi.fn().mockResolvedValue(overrides.roleExists === false ? null : { id: "r1" }),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const config = { get: vi.fn().mockReturnValue("admin@example.com") };
  const svc = new UsersService(
    prisma as unknown as ConstructorParameters<typeof UsersService>[0],
    audit as unknown as ConstructorParameters<typeof UsersService>[1],
    config as unknown as ConstructorParameters<typeof UsersService>[2],
  );
  return { svc, prisma, audit };
}

describe("UsersService.create", () => {
  it("rejects a duplicate email", async () => {
    const { svc } = makeService({ emailTaken: true });
    await expect(svc.create(baseDto, ctx)).rejects.toThrow(AppException);
  });

  it("rejects a duplicate cpf", async () => {
    const { svc } = makeService({ cpfTaken: true });
    await expect(svc.create(baseDto, ctx)).rejects.toThrow(AppException);
  });

  it("rejects an unknown roleId", async () => {
    const { svc } = makeService({ roleExists: false });
    await expect(svc.create(baseDto, ctx)).rejects.toThrow(AppException);
  });

  it("assigns the next sequential reference", async () => {
    const { svc, prisma } = makeService();
    prisma.user.findMany.mockResolvedValue([{ reference: "0003" }]);
    await svc.create(baseDto, ctx);
    expect(prisma.user.create.mock.calls[0][0].data.reference).toBe("0004");
  });

  it("uses a chosen reference, normalized to 4 digits", async () => {
    const { svc, prisma } = makeService();
    await svc.create({ ...baseDto, reference: "7" }, ctx);
    expect(prisma.user.create.mock.calls[0][0].data.reference).toBe("0007");
  });

  it("rejects a chosen reference that is already taken", async () => {
    const { svc, prisma } = makeService();
    prisma.user.findMany.mockResolvedValue([{ reference: "0007" }]);
    await expect(svc.create({ ...baseDto, reference: "0007" }, ctx)).rejects.toThrow(AppException);
  });

  it("rejects the reserved system reference", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, reference: "9999" }, ctx)).rejects.toThrow(AppException);
  });

  it("hashes the password and never returns it", async () => {
    const { svc, prisma } = makeService();
    const result = await svc.create(baseDto, ctx);
    const createArg = prisma.user.create.mock.calls[0][0];
    const hash = createArg.data.credential.create.passwordHash;
    expect(hash).not.toBe(baseDto.password);
    expect(hash.startsWith("$argon2")).toBe(true);
    expect(JSON.stringify(result)).not.toContain(baseDto.password);
  });

  it("audits the creation without leaking the password", async () => {
    const { svc, audit } = makeService();
    await svc.create(baseDto, ctx);
    const call = audit.record.mock.calls[0][0];
    expect(call.entity).toBe("User");
    expect(call.action).toBe("CREATE");
    expect(JSON.stringify(call)).not.toContain(baseDto.password);
  });
});

describe("UsersService.setPassword", () => {
  it("hashes the new password and never returns it", async () => {
    const { svc, prisma } = makeService();
    const result = await svc.setPassword("u2", "novaSenha1", ctx);
    const updateArg = prisma.credential.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ userId: "u2" });
    expect(updateArg.data.passwordHash).not.toBe("novaSenha1");
    expect(updateArg.data.passwordHash.startsWith("$argon2")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("novaSenha1");
  });

  it("audits the change without leaking the password", async () => {
    const { svc, audit } = makeService();
    await svc.setPassword("u2", "novaSenha1", ctx);
    const call = audit.record.mock.calls[0][0];
    expect(call.entity).toBe("User");
    expect(call.action).toBe("UPDATE");
    expect(JSON.stringify(call)).not.toContain("novaSenha1");
  });
});

describe("UsersService.setStatus", () => {
  it("deactivates and audits", async () => {
    const { svc, audit } = makeService();
    const result = await svc.setStatus("u2", "INACTIVE", ctx);
    expect(result.status).toBe("INACTIVE");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "User", action: "UPDATE" }),
    );
  });
});

describe("UsersService seeded admin protection", () => {
  it("refuses to edit the seeded admin", async () => {
    const { svc, prisma } = makeService({ existingEmail: "admin@example.com" });
    await expect(svc.update("u2", { name: "Outro" }, ctx)).rejects.toThrow(AppException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses to deactivate the seeded admin", async () => {
    const { svc, prisma } = makeService({ existingEmail: "Admin@Example.com" });
    await expect(svc.setStatus("u2", "INACTIVE", ctx)).rejects.toThrow(AppException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses to change the seeded admin password", async () => {
    const { svc, prisma } = makeService({ existingEmail: "admin@example.com" });
    await expect(svc.setPassword("u2", "novaSenha1", ctx)).rejects.toThrow(AppException);
    expect(prisma.credential.update).not.toHaveBeenCalled();
  });

  it("still edits regular users", async () => {
    const { svc, prisma } = makeService();
    await svc.update("u2", { name: "Outro" }, ctx);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("flags the seeded admin as a system user in the list", async () => {
    const { svc } = makeService({ existingEmail: "admin@example.com" });
    const [row] = await svc.list();
    expect(row.isSystem).toBe(true);
  });
});

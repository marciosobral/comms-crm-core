import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { UsersService } from "./users.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

const baseDto = {
  name: "Ciclano de Tal",
  email: "ciclano@example.com",
  cpf: "123.456.789-09",
  password: "senha123",
  roleId: "r1",
};

function makeService(
  overrides: { emailTaken?: boolean; cpfTaken?: boolean; roleExists?: boolean } = {},
) {
  const created = {
    id: "u2",
    name: baseDto.name,
    email: baseDto.email,
    cpf: baseDto.cpf,
    status: "ACTIVE",
    roleId: "r1",
    isSuperAdmin: false,
    reference: "AB12",
  };
  const prisma = {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockImplementation((args: { where: { email?: string; cpf?: string } }) => {
        if (args.where.email && overrides.emailTaken) return Promise.resolve({ id: "other" });
        if (args.where.cpf && overrides.cpfTaken) return Promise.resolve({ id: "other" });
        return Promise.resolve(null);
      }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(created),
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn().mockResolvedValue({ ...created, status: "INACTIVE" }),
    },
    role: {
      findUnique: vi.fn().mockResolvedValue(overrides.roleExists === false ? null : { id: "r1" }),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new UsersService(
    prisma as unknown as ConstructorParameters<typeof UsersService>[0],
    audit as unknown as ConstructorParameters<typeof UsersService>[1],
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

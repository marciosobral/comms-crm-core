import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { resolveFixedSaleDomains } from "./sale-defaults";

const pdvBlack = { id: "pdv-1", type: "PDV", value: "PDV PADRÃO", active: true };
const systemTim = { id: "sys-1", type: "SYSTEM", value: "SISTEMA PADRÃO", active: true };

function makePrisma(overrides?: {
  findFirst?: (args: {
    where: { type: "PDV" | "SYSTEM"; value: string; active: true };
  }) => PromiseLike<{ id: string } | null>;
}) {
  const findFirst =
    overrides?.findFirst ??
    vi.fn().mockImplementation((args: { where: { type: string } }) => {
      if (args.where.type === "PDV") return Promise.resolve(pdvBlack);
      if (args.where.type === "SYSTEM") return Promise.resolve(systemTim);
      return Promise.resolve(null);
    });
  return { domainValue: { findFirst } };
}

describe("resolveFixedSaleDomains", () => {
  it("resolves PDV PADRÃO and SISTEMA PADRÃO ids", async () => {
    const prisma = makePrisma();
    await expect(resolveFixedSaleDomains(prisma)).resolves.toEqual({
      pdvId: "pdv-1",
      systemId: "sys-1",
    });
  });

  it("throws when active PDV PDV PADRÃO is missing", async () => {
    const prisma = makePrisma({
      findFirst: vi.fn().mockImplementation((args: { where: { type: string } }) => {
        if (args.where.type === "PDV") return Promise.resolve(null);
        return Promise.resolve(systemTim);
      }),
    });
    await expect(resolveFixedSaleDomains(prisma)).rejects.toMatchObject({
      code: ErrorCode.DOMAIN_VALUE_INVALID,
      message: "Cadastre o PDV PDV PADRÃO em Configurações",
    });
    await expect(resolveFixedSaleDomains(prisma)).rejects.toBeInstanceOf(AppException);
  });

  it("throws when active SYSTEM SISTEMA PADRÃO is missing", async () => {
    const prisma = makePrisma({
      findFirst: vi.fn().mockImplementation((args: { where: { type: string } }) => {
        if (args.where.type === "PDV") return Promise.resolve(pdvBlack);
        return Promise.resolve(null);
      }),
    });
    await expect(resolveFixedSaleDomains(prisma)).rejects.toMatchObject({
      code: ErrorCode.DOMAIN_VALUE_INVALID,
      message: "Cadastre o sistema SISTEMA PADRÃO em Configurações",
    });
    await expect(resolveFixedSaleDomains(prisma)).rejects.toBeInstanceOf(AppException);
  });
});

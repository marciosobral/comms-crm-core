import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { resolveFixedSaleDomains } from "./sale-defaults";

const names = { pdv: "PDV PADRÃO", system: "SISTEMA PADRÃO" };
const pdvBlack = { id: "pdv-1", type: "PDV", value: names.pdv, active: true };
const systemTim = { id: "sys-1", type: "SYSTEM", value: names.system, active: true };

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
  it("resolves the configured PDV and system ids", async () => {
    const prisma = makePrisma();
    await expect(resolveFixedSaleDomains(prisma, names)).resolves.toEqual({
      pdvId: "pdv-1",
      systemId: "sys-1",
    });
    expect(prisma.domainValue.findFirst).toHaveBeenCalledWith({
      where: { type: "PDV", value: "PDV PADRÃO", active: true },
    });
  });

  it("names the missing PDV in the error", async () => {
    const prisma = makePrisma({ findFirst: vi.fn().mockResolvedValue(null) });
    await expect(resolveFixedSaleDomains(prisma, names)).rejects.toThrow(/PDV PADRÃO/);
  });

  it("throws when the active PDV is missing", async () => {
    const prisma = makePrisma({
      findFirst: vi.fn().mockImplementation((args: { where: { type: string } }) => {
        if (args.where.type === "PDV") return Promise.resolve(null);
        return Promise.resolve(systemTim);
      }),
    });
    await expect(resolveFixedSaleDomains(prisma, names)).rejects.toMatchObject({
      code: ErrorCode.DOMAIN_VALUE_INVALID,
      message: "Cadastre o PDV PDV PADRÃO em Configurações",
    });
    await expect(resolveFixedSaleDomains(prisma, names)).rejects.toBeInstanceOf(AppException);
  });

  it("throws when the active system is missing", async () => {
    const prisma = makePrisma({
      findFirst: vi.fn().mockImplementation((args: { where: { type: string } }) => {
        if (args.where.type === "PDV") return Promise.resolve(pdvBlack);
        return Promise.resolve(null);
      }),
    });
    await expect(resolveFixedSaleDomains(prisma, names)).rejects.toMatchObject({
      code: ErrorCode.DOMAIN_VALUE_INVALID,
      message: "Cadastre o sistema SISTEMA PADRÃO em Configurações",
    });
    await expect(resolveFixedSaleDomains(prisma, names)).rejects.toBeInstanceOf(AppException);
  });
});

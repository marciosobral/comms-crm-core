import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "../../prisma/generated/prisma/client/client";
import { AppException } from "../logging/app-exception";
import {
  assertNewAddressComplete,
  attachSaleAddress,
  ensureCatalogAddress,
  upsertCustomer,
} from "./sale-address";

function makeTx(overrides?: {
  customer?: Partial<Record<string, unknown>>;
  customerAddress?: Partial<Record<string, unknown>>;
  saleAddress?: Partial<Record<string, unknown>>;
}) {
  return {
    customer: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "c1" }),
      upsert: vi.fn().mockResolvedValue({ id: "c1" }),
      ...overrides?.customer,
    },
    customerAddress: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "addr-1" }),
      ...overrides?.customerAddress,
    },
    saleAddress: {
      create: vi.fn().mockResolvedValue({ id: "sa-1" }),
      ...overrides?.saleAddress,
    },
  } as unknown as Prisma.TransactionClient;
}

describe("upsertCustomer", () => {
  it("upserts by cpfCnpj when no id is given", async () => {
    const tx = makeTx();
    await upsertCustomer(tx, { name: "Fulana de Tal", cpfCnpj: "12345678909" });
    expect(tx.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cpfCnpj: "12345678909" } }),
    );
  });

  it("updates by id without touching cpfCnpj", async () => {
    const tx = makeTx({ customer: { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) } });
    await upsertCustomer(tx, { id: "c1", name: "Fulana de Tal", cpfCnpj: "12345678909" });
    expect(tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" } }),
    );
  });

  it("throws when the given customer id does not exist", async () => {
    const tx = makeTx({ customer: { findUnique: vi.fn().mockResolvedValue(null) } });
    await expect(
      upsertCustomer(tx, { id: "missing", name: "Fulana de Tal", cpfCnpj: "12345678909" }),
    ).rejects.toThrow(AppException);
  });
});

describe("attachSaleAddress", () => {
  it("creates a sale address snapshot and adds it to the customer catalog", async () => {
    const tx = makeTx();
    await attachSaleAddress(tx, "sale-1", "c1", {
      name: "Fulana de Tal",
      cpfCnpj: "12345678909",
      address: { city: "Goiânia", state: "GO", street: "Rua A", number: "10" },
    });
    expect(tx.saleAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ saleId: "sale-1", city: "Goiânia" }),
      }),
    );
    expect(tx.customerAddress.create).toHaveBeenCalled();
  });

  it("does nothing when there is no address to snapshot", async () => {
    const tx = makeTx();
    await attachSaleAddress(tx, "sale-1", "c1", {
      name: "Fulana de Tal",
      cpfCnpj: "12345678909",
    });
    expect(tx.saleAddress.create).not.toHaveBeenCalled();
  });
});

describe("assertNewAddressComplete", () => {
  const completeAddress = {
    postalCode: "60000000",
    street: "Rua A",
    number: "10",
    neighborhood: "Centro",
    city: "Fortaleza",
    state: "CE",
  };

  it("accepts a fully filled address", () => {
    expect(() => assertNewAddressComplete(completeAddress)).not.toThrow();
  });

  it("accepts a S/N address without a street number", () => {
    expect(() =>
      assertNewAddressComplete({ ...completeAddress, number: "", noNumber: true }),
    ).not.toThrow();
  });

  it("does not require a complement", () => {
    expect(() => assertNewAddressComplete({ ...completeAddress, complement: "" })).not.toThrow();
  });

  it.each([
    ["postalCode", { ...completeAddress, postalCode: "" }],
    ["street", { ...completeAddress, street: "" }],
    ["number", { ...completeAddress, number: "" }],
    ["neighborhood", { ...completeAddress, neighborhood: "" }],
    ["city", { ...completeAddress, city: "" }],
    ["state", { ...completeAddress, state: "" }],
  ])("requires %s", (_field, address) => {
    expect(() => assertNewAddressComplete(address)).toThrow(AppException);
  });

  it("requires an address at all when none is given", () => {
    expect(() => assertNewAddressComplete(undefined)).toThrow(AppException);
  });
});

describe("ensureCatalogAddress", () => {
  const snapshot = {
    postalCode: null,
    street: "Rua A",
    number: "10",
    noNumber: false,
    complement: null,
    neighborhood: null,
    city: "Goiânia",
    state: "GO",
  };

  it("creates the address as the default when the catalog is empty", async () => {
    const tx = makeTx();
    await ensureCatalogAddress(tx, "c1", snapshot);
    expect(tx.customerAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDefault: true }) }),
    );
  });

  it("skips creating a duplicate of an existing address", async () => {
    const tx = makeTx({
      customerAddress: { findMany: vi.fn().mockResolvedValue([{ id: "addr-1", ...snapshot }]) },
    });
    await ensureCatalogAddress(tx, "c1", snapshot);
    expect(tx.customerAddress.create).not.toHaveBeenCalled();
  });
});

import { AppException } from "@/logging/app-exception";
import type { Prisma } from "@prisma-client";
import { describe, expect, it, vi } from "vitest";
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
  sale?: Partial<Record<string, unknown>>;
}) {
  return {
    customer: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "c1" }),
      create: vi.fn().mockResolvedValue({ id: "c1" }),
      ...overrides?.customer,
    },
    sale: {
      count: vi.fn().mockResolvedValue(0),
      ...overrides?.sale,
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

const plainSeller = {
  id: "seller-1",
  isSuperAdmin: false,
  status: "ACTIVE",
  role: { permissions: ["sales.create"] },
};
const editor = { ...plainSeller, role: { permissions: ["sales.create", "customers.edit"] } };
const viewAll = { ...plainSeller, role: { permissions: ["sales.create", "sales.view_all"] } };
const existingCustomer = { id: "c1", cpfCnpj: "12345678909", name: "Fulano de Tal", addresses: [] };
const inputById = { id: "c1", name: "Fulana de Tal", cpfCnpj: "", email: "novo@example.com" };
const inputByCpf = { name: "Fulana de Tal", cpfCnpj: "12345678909", email: "novo@example.com" };

function txWithExisting(saleCount = 0) {
  return makeTx({
    customer: { findUnique: vi.fn().mockResolvedValue(existingCustomer) },
    sale: { count: vi.fn().mockResolvedValue(saleCount) },
  });
}

describe("upsertCustomer", () => {
  it("creates by cpfCnpj with the full fields when no customer exists", async () => {
    const tx = makeTx();
    const result = await upsertCustomer(
      tx,
      { name: "Fulana de Tal", cpfCnpj: "12345678909" },
      plainSeller,
    );
    expect(tx.customer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cpfCnpj: "12345678909" } }),
    );
    expect(tx.customer.create).toHaveBeenCalledWith({
      data: {
        cpfCnpj: "12345678909",
        name: "Fulana de Tal",
        birthDate: null,
        motherName: null,
        email: null,
        phone1: null,
        phone2: null,
      },
    });
    expect(result).toEqual({ customer: { id: "c1" }, before: null, after: null });
  });

  it("throws when the given customer id does not exist", async () => {
    const tx = makeTx();
    await expect(upsertCustomer(tx, inputById, plainSeller)).rejects.toThrow(AppException);
  });

  it.each([
    ["id", inputById],
    ["cpfCnpj", inputByCpf],
  ])(
    "only links an existing customer found by %s when the actor may not edit it",
    async (_by, input) => {
      const tx = txWithExisting(0);
      const result = await upsertCustomer(tx, input, plainSeller);
      expect(tx.customer.update).not.toHaveBeenCalled();
      expect(result).toEqual({ customer: existingCustomer, before: null, after: null });
    },
  );

  it.each([
    ["id", inputById],
    ["cpfCnpj", inputByCpf],
  ])(
    "updates only the provided fields found by %s when the actor has a visible sale",
    async (_by, input) => {
      const tx = txWithExisting(1);
      const result = await upsertCustomer(tx, input, plainSeller);
      expect(tx.sale.count).toHaveBeenCalledWith({
        where: { customerId: "c1", sellerId: "seller-1" },
      });
      const { data, where } = vi.mocked(tx.customer.update).mock.calls[0][0];
      expect(where).toEqual({ id: "c1" });
      expect(data).toEqual({
        name: "Fulana de Tal",
        email: "novo@example.com",
        birthDate: undefined,
        motherName: undefined,
        phone1: undefined,
        phone2: undefined,
      });
      expect(data).not.toHaveProperty("cpfCnpj");
      expect(result.before).toBe(existingCustomer);
      expect(result.after).toEqual({ id: "c1" });
    },
  );

  it.each([
    ["id", inputById],
    ["cpfCnpj", inputByCpf],
  ])("updates when the actor has customers.edit and no sale (found by %s)", async (_by, input) => {
    const tx = txWithExisting(0);
    await upsertCustomer(tx, input, editor);
    expect(tx.customer.update).toHaveBeenCalled();
  });

  it("counts any sale of the customer for an actor with sales.view_all", async () => {
    const tx = txWithExisting(1);
    await upsertCustomer(tx, inputById, viewAll);
    expect(tx.sale.count).toHaveBeenCalledWith({ where: { customerId: "c1" } });
    expect(tx.customer.update).toHaveBeenCalled();
  });

  it("treats blank strings as missing so they never erase stored data", async () => {
    const tx = txWithExisting(1);
    await upsertCustomer(
      tx,
      { id: "c1", name: "  ", cpfCnpj: "", email: "", motherName: " ", phone1: "", phone2: "" },
      plainSeller,
    );
    const { data } = vi.mocked(tx.customer.update).mock.calls[0][0];
    expect(data).toEqual({
      name: undefined,
      birthDate: undefined,
      motherName: undefined,
      email: undefined,
      phone1: undefined,
      phone2: undefined,
    });
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

import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { CustomersService } from "./customers.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

function makeService() {
  const customer = {
    id: "c1",
    name: "Fulana de Tal",
    cpfCnpj: "123.456.789-09",
    createdAt: new Date("2025-02-12"),
  };
  const prisma = {
    customer: {
      findMany: vi.fn().mockResolvedValue([{ ...customer, _count: { sales: 3 }, sales: [] }]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue(customer),
      findUniqueOrThrow: vi.fn().mockResolvedValue(customer),
      update: vi.fn().mockResolvedValue({ ...customer, city: "Goiânia" }),
      create: vi.fn().mockResolvedValue(customer),
    },
    sale: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new CustomersService(
    prisma as unknown as ConstructorParameters<typeof CustomersService>[0],
    audit as unknown as ConstructorParameters<typeof CustomersService>[1],
  );
  return { svc, prisma, audit };
}

describe("CustomersService", () => {
  it("builds an insensitive contains filter from q", async () => {
    const { svc, prisma } = makeService();
    await svc.list({ q: "ana" });
    const arg = prisma.customer.findMany.mock.calls[0][0];
    expect(arg.where.OR).toContainEqual({ name: { contains: "ana", mode: "insensitive" } });
    expect(arg.where.OR).toContainEqual({ cpfCnpj: { contains: "ana" } });
  });

  it("passes no where when no filters are given", async () => {
    const { svc, prisma } = makeService();
    await svc.list({});
    expect(prisma.customer.findMany.mock.calls[0][0].where).toEqual({});
  });

  it("maps rows to include salesCount and lastSaleDate", async () => {
    const { svc } = makeService();
    const result = await svc.list({});
    expect(result.items[0]).toMatchObject({ salesCount: 3, lastSaleDate: null });
  });

  it("filters by seller and month via sales.some", async () => {
    const { svc, prisma } = makeService();
    await svc.list({ sellerId: "s1", month: "2026-08" });
    const arg = prisma.customer.findMany.mock.calls[0][0];
    expect(arg.where.sales.some.sellerId).toBe("s1");
    expect(arg.where.sales.some.date.gte).toEqual(new Date(2026, 7, 1));
    expect(arg.where.sales.some.date.lt).toEqual(new Date(2026, 8, 1));
  });

  it("audits updates with before and after", async () => {
    const { svc, audit } = makeService();
    await svc.update("c1", { city: "Goiânia" }, ctx);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Customer", action: "UPDATE" }),
    );
  });

  it("rejects create with a duplicate cpfCnpj", async () => {
    const { svc, prisma } = makeService();
    prisma.customer.findUnique.mockResolvedValueOnce({ id: "other", cpfCnpj: "123.456.789-09" });
    await expect(
      svc.create({ name: "Novo", cpfCnpj: "123.456.789-09" }, ctx),
    ).rejects.toBeInstanceOf(AppException);
  });

  it("allows update to keep its own cpfCnpj", async () => {
    const { svc, prisma } = makeService();
    prisma.customer.findUnique.mockResolvedValueOnce({ id: "c1", cpfCnpj: "123.456.789-09" });
    await expect(svc.update("c1", { cpfCnpj: "123.456.789-09" }, ctx)).resolves.toBeDefined();
  });

  it("builds detail with summary, billing, and status counts", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany.mockResolvedValueOnce([
      {
        id: "s1",
        amount: "109.99",
        canceledAt: null,
        status: { value: "GROSS" },
        paymentMethod: { id: "p1", value: "Débito automático" },
        dueDay: 10,
        pdv: { id: "pdv1", value: "PDV PADRÃO" },
        bankName: "Banco do Brasil",
        bankAgency: "3041-2",
        bankAccount: "18.774-6",
      },
      {
        id: "s2",
        amount: "39.90",
        canceledAt: new Date(),
        status: { value: "CANCELADA" },
        paymentMethod: null,
        dueDay: null,
        pdv: null,
        bankName: null,
        bankAgency: null,
        bankAccount: null,
      },
    ]);
    const result = await svc.detail("c1");
    expect(result.summary).toMatchObject({ totalSales: 2, activeSales: 1, monthlyRevenue: 109.99 });
    expect(result.billing.pdv).toEqual({ id: "pdv1", value: "PDV PADRÃO" });
    expect(result.salesByStatus).toContainEqual({ status: "GROSS", count: 1 });
    expect(result.salesByStatus).toContainEqual({ status: "CANCELADA", count: 1 });
  });

  it("throws CUSTOMER_NOT_FOUND when detail id is missing", async () => {
    const { svc, prisma } = makeService();
    prisma.customer.findUnique.mockResolvedValueOnce(null);
    await expect(svc.detail("missing")).rejects.toBeInstanceOf(AppException);
  });

  it("builds a csv of the customer's sales history", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany.mockResolvedValueOnce([
      {
        date: new Date(2026, 7, 30),
        amount: "99.90",
        customer: { name: "Fulana de Tal" },
        internetPlan: { name: "300 Mbps" },
        fixedPlan: null,
        seller: { name: "Beltrano Souza" },
        status: { value: "GROSS" },
      },
    ]);
    const csv = await svc.historyCsv("c1");
    const lines = csv.split("\n");
    expect(lines[0]).toBe("data;cliente;plano;vendedor;status;valor");
    expect(lines[1]).toBe("30/08/2026;Fulana de Tal;300 Mbps;Beltrano Souza;GROSS;99,90");
  });

  it("throws CUSTOMER_NOT_FOUND when exporting history for a missing customer", async () => {
    const { svc, prisma } = makeService();
    prisma.customer.findUnique.mockResolvedValueOnce(null);
    await expect(svc.historyCsv("missing")).rejects.toBeInstanceOf(AppException);
  });
});

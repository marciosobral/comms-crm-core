import { describe, expect, it, vi } from "vitest";
import { AppException } from "../logging/app-exception";
import { PermissionsService } from "../permissions/permissions.service";
import { SalesService } from "./sales.service";

const ctx = { userId: "seller-1", ip: null, userAgent: null };

const seller = {
  id: "seller-1",
  name: "Beltrana Souza",
  isSuperAdmin: false,
  status: "ACTIVE",
  role: { permissions: ["sales.create"] },
};
const admin = {
  id: "admin-1",
  name: "Admin",
  isSuperAdmin: true,
  status: "ACTIVE",
  role: null,
};
const sellerFull = {
  id: "seller-1",
  name: "Beltrana Souza",
  isSuperAdmin: false,
  status: "ACTIVE",
  role: { permissions: ["sales.create", "sales.edit", "sales.change_status"] },
};

const internetPlan = { id: "plan-net", active: true, basePrice: "119.9", minPrice: "79.9" };
const statusGross = { id: "st-gross", type: "SALE_STATUS", value: "GROSS", active: true };
const pdvBlack = { id: "pdv-1", type: "PDV", value: "PDV PADRÃO", active: true, order: 1 };
const payBoleto = { id: "pay-1", type: "PAYMENT_METHOD", value: "BOLETO", active: true };
const payDebit = { id: "pay-2", type: "PAYMENT_METHOD", value: "DÉBITO AUTOMÁTICO", active: true };

const baseDto = {
  customer: { name: "Fulana de Tal", cpfCnpj: "123.456.789-09" },
  internetPlanId: "plan-net",
  statusId: "st-gross",
  paymentMethodId: "pay-1",
  amount: 109.99,
  date: "2026-08-25",
};

function makeService() {
  const createdSale = { id: "sale-1", amount: "109.99" };
  const domainValues: Record<string, unknown> = {
    "st-gross": statusGross,
    "pay-1": payBoleto,
    "pay-2": payDebit,
    "pdv-1": pdvBlack,
  };
  const prisma = {
    plan: {
      findUnique: vi
        .fn()
        .mockImplementation((args: { where: { id: string } }) =>
          Promise.resolve(args.where.id === "plan-net" ? internetPlan : null),
        ),
    },
    domainValue: {
      findUnique: vi
        .fn()
        .mockImplementation((args: { where: { id: string } }) =>
          Promise.resolve(domainValues[args.where.id] ?? null),
        ),
      findFirst: vi.fn().mockResolvedValue(pdvBlack),
    },
    customer: {
      upsert: vi.fn().mockResolvedValue({ id: "c1", cpfCnpj: baseDto.customer.cpfCnpj }),
    },
    sale: {
      create: vi.fn().mockResolvedValue(createdSale),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue(createdSale),
    },
    auditLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const notifications = { notifySaleChange: vi.fn().mockResolvedValue(undefined) };
  const svc = new SalesService(
    prisma as unknown as ConstructorParameters<typeof SalesService>[0],
    audit as unknown as ConstructorParameters<typeof SalesService>[1],
    new PermissionsService(),
    notifications as unknown as ConstructorParameters<typeof SalesService>[3],
  );
  return { svc, prisma, audit, notifications };
}

describe("SalesService.create", () => {
  it("creates with defaults: seller = actor, pdv = first active PDV", async () => {
    const { svc, prisma } = makeService();
    await svc.create(baseDto, seller, ctx);
    const data = prisma.sale.create.mock.calls[0][0].data;
    expect(data.sellerId).toBe("seller-1");
    expect(data.pdvId).toBe("pdv-1");
  });

  it("rejects amount above the internet plan base price", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, amount: 129.9 }, seller, ctx)).rejects.toThrow(
      AppException,
    );
  });

  it("rejects amount below the min price", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, amount: 50 }, seller, ctx)).rejects.toThrow(AppException);
  });

  it("accepts the boundary values", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, amount: 79.9 }, seller, ctx)).resolves.toBeDefined();
    await expect(svc.create({ ...baseDto, amount: 119.9 }, seller, ctx)).resolves.toBeDefined();
  });

  it("rejects a sale without any plan", async () => {
    const { svc } = makeService();
    await expect(
      svc.create({ ...baseDto, internetPlanId: undefined }, seller, ctx),
    ).rejects.toThrow(AppException);
  });

  it("rejects debit payment without bank data", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, paymentMethodId: "pay-2" }, seller, ctx)).rejects.toThrow(
      AppException,
    );
  });

  it("accepts debit payment with bank data", async () => {
    const { svc } = makeService();
    await expect(
      svc.create(
        {
          ...baseDto,
          paymentMethodId: "pay-2",
          bankAgency: "3041-2",
          bankAccount: "18.774-6",
          bankName: "001 — Banco do Brasil",
        },
        seller,
        ctx,
      ),
    ).resolves.toBeDefined();
  });

  it("denies setting another seller without sales.change_seller", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, sellerId: "other-seller" }, seller, ctx)).rejects.toThrow(
      AppException,
    );
  });

  it("allows super admin to set another seller", async () => {
    const { svc, prisma } = makeService();
    await svc.create({ ...baseDto, sellerId: "other-seller" }, admin, {
      ...ctx,
      userId: "admin-1",
    });
    expect(prisma.sale.create.mock.calls[0][0].data.sellerId).toBe("other-seller");
  });

  it("upserts the customer by cpfCnpj and audits the sale", async () => {
    const { svc, prisma, audit } = makeService();
    await svc.create(baseDto, seller, ctx);
    expect(prisma.customer.upsert.mock.calls[0][0].where).toEqual({
      cpfCnpj: baseDto.customer.cpfCnpj,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Sale", action: "CREATE" }),
    );
  });

  it("rejects an inactive or unknown domain value", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, statusId: "st-unknown" }, seller, ctx)).rejects.toThrow(
      AppException,
    );
  });
});

describe("SalesService.list", () => {
  it("forces sellerId to the actor without sales.view_all", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany = vi.fn().mockResolvedValue([]);
    prisma.sale.count = vi.fn().mockResolvedValue(0);
    await svc.list({}, seller);
    expect(prisma.sale.findMany.mock.calls[0][0].where.sellerId).toBe("seller-1");
  });

  it("respects an explicit sellerId filter for viewers with sales.view_all", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany = vi.fn().mockResolvedValue([]);
    prisma.sale.count = vi.fn().mockResolvedValue(0);
    await svc.list({ sellerId: "other" }, admin);
    expect(prisma.sale.findMany.mock.calls[0][0].where.sellerId).toBe("other");
  });

  it("builds date range and city filters", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany = vi.fn().mockResolvedValue([]);
    prisma.sale.count = vi.fn().mockResolvedValue(0);
    await svc.list({ from: "2026-08-01", to: "2026-08-31", city: "Goiânia" }, admin);
    const where = prisma.sale.findMany.mock.calls[0][0].where;
    expect(where.date.gte).toEqual(new Date("2026-08-01"));
    expect(where.date.lte).toEqual(new Date("2026-08-31"));
    expect(where.customer).toEqual({ city: { contains: "Goiânia", mode: "insensitive" } });
  });

  it("caps perPage at 100", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany = vi.fn().mockResolvedValue([]);
    prisma.sale.count = vi.fn().mockResolvedValue(0);
    const result = await svc.list({ perPage: 500 }, admin);
    expect(prisma.sale.findMany.mock.calls[0][0].take).toBe(100);
    expect(result.perPage).toBe(100);
  });
});

describe("SalesService.detail", () => {
  it("denies another seller's sale without sales.view_all", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue({ id: "sale-1", sellerId: "someone-else" });
    await expect(svc.detail("sale-1", seller)).rejects.toThrow(AppException);
  });

  it("returns own sale", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue({ id: "sale-1", sellerId: "seller-1" });
    await expect(svc.detail("sale-1", seller)).resolves.toBeDefined();
  });
});

describe("SalesService.setStatus / cancel", () => {
  function withSale(svcBundle: ReturnType<typeof makeService>, sale: Record<string, unknown>) {
    svcBundle.prisma.sale.findUnique = vi.fn().mockResolvedValue(sale);
    svcBundle.prisma.sale.update = vi
      .fn()
      .mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...sale, ...args.data }),
      );
    svcBundle.prisma.domainValue.findFirst = vi.fn().mockResolvedValue({
      id: "st-cancel",
      type: "SALE_STATUS",
      value: "CANCELADA",
      active: true,
    });
    return svcBundle;
  }

  it("changes status and audits", async () => {
    const { svc, prisma, audit } = withSale(makeService(), {
      id: "sale-1",
      sellerId: "seller-1",
      canceledAt: null,
      customer: { name: "Fulana de Tal" },
      status: { value: "GROSS" },
    });
    await svc.setStatus("sale-1", "st-gross", sellerFull, ctx);
    expect(prisma.sale.update.mock.calls[0][0].data.statusId).toBe("st-gross");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Sale", action: "UPDATE" }),
    );
  });

  it("cancels with reason, setting CANCELADA status and cancel fields", async () => {
    const { svc, prisma } = withSale(makeService(), {
      id: "sale-1",
      sellerId: "seller-1",
      canceledAt: null,
      customer: { name: "Fulana de Tal" },
    });
    await svc.cancel("sale-1", "Cliente desistiu", sellerFull, ctx);
    const data = prisma.sale.update.mock.calls[0][0].data;
    expect(data.statusId).toBe("st-cancel");
    expect(data.cancelReason).toBe("Cliente desistiu");
    expect(data.canceledById).toBe("seller-1");
    expect(data.canceledAt).toBeInstanceOf(Date);
  });

  it("refuses to cancel an already-canceled sale", async () => {
    const { svc } = withSale(makeService(), {
      id: "sale-1",
      sellerId: "seller-1",
      canceledAt: new Date(),
    });
    await expect(svc.cancel("sale-1", "de novo", sellerFull, ctx)).rejects.toThrow(AppException);
  });
});

describe("SalesService.setSeller", () => {
  it("notifies the previous and new seller with the seller-change detail", async () => {
    const { svc, prisma, notifications } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue({
      id: "sale-1",
      sellerId: "seller-1",
      canceledAt: null,
      customer: { name: "Fulana de Tal" },
      seller: { name: "Beltrana Souza" },
    });
    prisma.sale.update = vi.fn().mockResolvedValue({
      id: "sale-1",
      sellerId: "new-seller-id",
      seller: { name: "Ciclano Lima" },
    });
    await svc.setSeller("sale-1", "new-seller-id", admin, ctx);
    expect(notifications.notifySaleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "seller",
        detail: "Beltrana Souza → Ciclano Lima",
        sellerId: "new-seller-id",
        previousSellerId: "seller-1",
      }),
    );
  });
});

describe("SalesService.update locked fields", () => {
  it("denies pdvId change without sales.edit_locked_fields", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi
      .fn()
      .mockResolvedValue({ id: "sale-1", sellerId: "seller-1", canceledAt: null });
    await expect(svc.update("sale-1", { pdvId: "pdv-other" }, sellerFull, ctx)).rejects.toThrow(
      AppException,
    );
  });

  it("never changes statusId, since UpdateSaleDto no longer carries it", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue({
      id: "sale-1",
      sellerId: "seller-1",
      canceledAt: null,
      statusId: "st-a",
      internetPlanId: "plan-net",
      fixedPlanId: null,
      amount: "109.99",
      pdvId: "pdv-1",
      customer: { name: "Fulana de Tal" },
    });
    prisma.sale.update = vi.fn().mockResolvedValue({ id: "sale-1", statusId: "st-a" });
    await svc.update("sale-1", { notes: "x" }, sellerFull, ctx);
    expect(prisma.sale.update.mock.calls[0][0].data.statusId).toBeUndefined();
  });
});

describe("SalesService.getActor", () => {
  it("rejects an inactive user", async () => {
    const { svc, prisma } = makeService();
    prisma.user.findUnique = vi
      .fn()
      .mockResolvedValue({ id: "seller-1", status: "INACTIVE", role: null });
    await expect(svc.getActor("seller-1")).rejects.toThrow(AppException);
  });
});

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
const fixedPlan = { id: "plan-fix", active: true, basePrice: "119.9", minPrice: "59.9" };
const statusGross = { id: "st-gross", type: "SALE_STATUS", value: "GROSS", active: true };
const pdvBlack = { id: "pdv-1", type: "PDV", value: "PDV PADRÃO", active: true, order: 1 };
const systemTim = { id: "sys-1", type: "SYSTEM", value: "SISTEMA PADRÃO", active: true };
const payBoleto = { id: "pay-1", type: "PAYMENT_METHOD", value: "BOLETO", active: true };
const payDebit = { id: "pay-2", type: "PAYMENT_METHOD", value: "DÉBITO AUTOMÁTICO", active: true };
const periodMorning = {
  id: "per-1",
  type: "SCHEDULE_PERIOD",
  value: "10:00 - 12:00",
  active: true,
};

const baseDto = {
  customer: { name: "Fulana de Tal", cpfCnpj: "12345678909" },
  planId: "plan-net",
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
    "per-1": periodMorning,
  };
  const prisma = {
    plan: {
      findUnique: vi
        .fn()
        .mockImplementation((args: { where: { id: string } }) =>
          Promise.resolve(
            args.where.id === "plan-net"
              ? internetPlan
              : args.where.id === "plan-fix"
                ? fixedPlan
                : null,
          ),
        ),
      findMany: vi.fn().mockResolvedValue([]),
    },
    domainValue: {
      findUnique: vi
        .fn()
        .mockImplementation((args: { where: { id: string } }) =>
          Promise.resolve(domainValues[args.where.id] ?? null),
        ),
      findFirst: vi.fn().mockImplementation((args: { where: { type: string } }) => {
        if (args.where.type === "PDV") return Promise.resolve(pdvBlack);
        if (args.where.type === "SYSTEM") return Promise.resolve(systemTim);
        return Promise.resolve(null);
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    customer: {
      upsert: vi.fn().mockResolvedValue({ id: "c1", cpfCnpj: baseDto.customer.cpfCnpj }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "c1", cpfCnpj: baseDto.customer.cpfCnpj }),
    },
    customerAddress: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "addr-1" }),
    },
    saleAddress: {
      create: vi.fn().mockResolvedValue({ id: "sa-1" }),
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
      findMany: vi.fn().mockResolvedValue([]),
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
  it("creates with defaults: seller = actor, pdv = PDV PADRÃO, system = SISTEMA PADRÃO, qty = 1", async () => {
    const { svc, prisma } = makeService();
    await svc.create(baseDto, seller, ctx);
    const data = prisma.sale.create.mock.calls[0][0].data;
    expect(data.sellerId).toBe("seller-1");
    expect(data.pdvId).toBe("pdv-1");
    expect(data.systemId).toBe("sys-1");
    expect(data.qty).toBe(1);
  });

  it("ignores dto qty/pdvId/systemId and forces PDV PADRÃO / SISTEMA PADRÃO / qty 1", async () => {
    const { svc, prisma } = makeService();
    await svc.create({ ...baseDto, qty: 99, pdvId: "other", systemId: "other" }, seller, ctx);
    const data = prisma.sale.create.mock.calls[0][0].data;
    expect(data.qty).toBe(1);
    expect(data.pdvId).toBe("pdv-1");
    expect(data.systemId).toBe("sys-1");
  });

  it("fails create when SYSTEM SISTEMA PADRÃO is missing", async () => {
    const { svc, prisma } = makeService();
    prisma.domainValue.findFirst = vi
      .fn()
      .mockImplementation((args: { where: { type: string } }) => {
        if (args.where.type === "PDV") return Promise.resolve(pdvBlack);
        return Promise.resolve(null);
      });
    await expect(svc.create(baseDto, seller, ctx)).rejects.toThrow(AppException);
  });

  it("snapshots a new address onto the sale and the customer catalog", async () => {
    const { svc, prisma } = makeService();
    await svc.create(
      {
        ...baseDto,
        customer: {
          ...baseDto.customer,
          address: { city: "Goiânia", state: "GO", street: "Rua A", number: "10" },
        },
      },
      seller,
      ctx,
    );
    expect(prisma.saleAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saleId: "sale-1",
          city: "Goiânia",
          state: "GO",
          street: "Rua A",
          number: "10",
        }),
      }),
    );
    expect(prisma.customerAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: "c1",
          city: "Goiânia",
          isDefault: true,
        }),
      }),
    );
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

  it("stores the schedule date and period", async () => {
    const { svc, prisma } = makeService();
    await svc.create(
      { ...baseDto, scheduleDate: "2026-06-03", schedulePeriodId: "per-1" },
      seller,
      ctx,
    );
    const data = prisma.sale.create.mock.calls[0][0].data;
    expect(data.scheduleDate).toEqual(new Date("2026-06-03"));
    expect(data.schedulePeriodId).toBe("per-1");
  });

  it("rejects a schedule period from another domain", async () => {
    const { svc } = makeService();
    await expect(
      svc.create({ ...baseDto, schedulePeriodId: "st-gross" }, seller, ctx),
    ).rejects.toThrow(AppException);
  });

  it("rejects a sale without any plan", async () => {
    const { svc } = makeService();
    await expect(svc.create({ ...baseDto, planId: undefined }, seller, ctx)).rejects.toThrow(
      AppException,
    );
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
          bankCode: "001",
          bankAgency: "3041",
          bankAccount: "18774",
          bankAccountDigit: "6",
          bankAccountType: "CHECKING",
          accountHolderIsCustomer: true,
        },
        seller,
        ctx,
      ),
    ).resolves.toBeDefined();
  });

  it("stores the official bank name for a direct debit", async () => {
    const { svc, prisma } = makeService();
    await svc.create(
      {
        ...baseDto,
        paymentMethodId: "pay-2",
        bankCode: "001",
        bankAgency: "3041",
        bankAccount: "18774",
        bankAccountDigit: "6",
        bankAccountType: "CHECKING",
        accountHolderIsCustomer: true,
      },
      seller,
      ctx,
    );
    const data = prisma.sale.create.mock.calls[0][0].data;
    expect(data.bankName).toBe("BCO DO BRASIL S.A.");
    expect(data.bankCode).toBe("001");
  });

  it("drops bank data when paying by boleto", async () => {
    const { svc, prisma } = makeService();
    await svc.create({ ...baseDto, bankCode: "001", bankAccount: "18774" }, seller, ctx);
    const data = prisma.sale.create.mock.calls[0][0].data;
    expect(data.bankCode).toBeNull();
    expect(data.bankAccount).toBeNull();
  });

  it("requires a payment method", async () => {
    const { svc } = makeService();
    await expect(
      svc.create({ ...baseDto, paymentMethodId: undefined }, seller, ctx),
    ).rejects.toThrow(AppException);
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

  it("updates an existing customer by id without changing cpfCnpj", async () => {
    const { svc, prisma } = makeService();
    prisma.customer.findUnique.mockResolvedValueOnce({ id: "c1", cpfCnpj: "12345678909" });
    await svc.create(
      {
        ...baseDto,
        customer: { id: "c1", name: "Fulana de Tal", cpfCnpj: "123.xxx.x89-09" },
      },
      seller,
      ctx,
    );
    expect(prisma.customer.upsert).not.toHaveBeenCalled();
    expect(prisma.customer.update.mock.calls[0][0].where).toEqual({ id: "c1" });
    expect(prisma.customer.update.mock.calls[0][0].data.cpfCnpj).toBeUndefined();
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
    expect(where.address).toEqual({ city: { contains: "Goiânia", mode: "insensitive" } });
  });

  it("caps perPage at 100", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany = vi.fn().mockResolvedValue([]);
    prisma.sale.count = vi.fn().mockResolvedValue(0);
    const result = await svc.list({ perPage: 500 }, admin);
    expect(prisma.sale.findMany.mock.calls[0][0].take).toBe(100);
    expect(result.perPage).toBe(100);
  });

  it("masks customer documents without customers.view_document", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany = vi
      .fn()
      .mockResolvedValue([{ id: "sale-1", customer: { name: "Fulana", cpfCnpj: "12345678909" } }]);
    prisma.sale.count = vi.fn().mockResolvedValue(1);
    const result = await svc.list({}, seller);
    expect(result.items[0].customer.cpfCnpj).toBe("123.xxx.x89-09");
  });

  it("keeps customer documents with customers.view_document", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findMany = vi
      .fn()
      .mockResolvedValue([{ id: "sale-1", customer: { name: "Fulana", cpfCnpj: "12345678909" } }]);
    prisma.sale.count = vi.fn().mockResolvedValue(1);
    const result = await svc.list(
      {},
      {
        ...seller,
        role: { permissions: ["sales.create", "customers.view_document"] },
      },
    );
    expect(result.items[0].customer.cpfCnpj).toBe("12345678909");
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
    prisma.sale.findUnique = vi.fn().mockResolvedValue({
      id: "sale-1",
      sellerId: "seller-1",
      customer: { cpfCnpj: "12345678909" },
    });
    await expect(svc.detail("sale-1", seller)).resolves.toBeDefined();
  });

  it("masks the customer document without customers.view_document", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue({
      id: "sale-1",
      sellerId: "seller-1",
      customer: { cpfCnpj: "12345678909" },
    });
    const sale = await svc.detail("sale-1", seller);
    expect(sale.customer.cpfCnpj).toBe("123.xxx.x89-09");
  });
});

describe("SalesService.history", () => {
  function withSale(svcBundle: ReturnType<typeof makeService>) {
    svcBundle.prisma.sale.findUnique = vi
      .fn()
      .mockResolvedValue({ id: "sale-1", sellerId: "seller-1" });
    return svcBundle;
  }

  it("drops the id field on CREATE entries and resolves reference ids to names", async () => {
    const { svc, prisma } = withSale(makeService());
    prisma.auditLog.findMany = vi.fn().mockResolvedValue([
      {
        id: "log-1",
        action: "CREATE",
        diff: {
          id: { from: null, to: "sale-1" },
          statusId: { from: null, to: "st-gross" },
          sellerId: { from: null, to: "seller-1" },
        },
      },
    ]);
    prisma.domainValue.findMany = vi.fn().mockResolvedValue([statusGross]);
    prisma.user.findMany = vi.fn().mockResolvedValue([{ id: "seller-1", name: "Beltrana Souza" }]);
    prisma.plan.findMany = vi.fn().mockResolvedValue([]);

    const [entry] = await svc.history("sale-1", seller);
    expect(entry.diff).toEqual({
      statusId: { from: null, to: "GROSS" },
      sellerId: { from: null, to: "Beltrana Souza" },
    });
  });

  it("falls back to a dash for a reference id that no longer resolves", async () => {
    const { svc, prisma } = withSale(makeService());
    prisma.auditLog.findMany = vi
      .fn()
      .mockResolvedValue([
        { id: "log-1", action: "UPDATE", diff: { sellerId: { from: null, to: "deleted-user" } } },
      ]);
    prisma.domainValue.findMany = vi.fn().mockResolvedValue([]);
    prisma.user.findMany = vi.fn().mockResolvedValue([]);
    prisma.plan.findMany = vi.fn().mockResolvedValue([]);

    const [entry] = await svc.history("sale-1", seller);
    expect(entry.diff).toEqual({ sellerId: { from: null, to: "-" } });
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
      planId: "plan-net",
      amount: "109.99",
      pdvId: "pdv-1",
      customer: { name: "Fulana de Tal" },
    });
    prisma.sale.update = vi.fn().mockResolvedValue({ id: "sale-1", statusId: "st-a" });
    await svc.update("sale-1", { notes: "x" }, sellerFull, ctx);
    expect(prisma.sale.update.mock.calls[0][0].data.statusId).toBeUndefined();
  });
});

const beforeSale = {
  id: "sale-1",
  sellerId: "seller-1",
  canceledAt: null,
  statusId: "st-a",
  planId: "plan-net",
  amount: "109.99",
  pdvId: "pdv-1",
  customer: { name: "Fulana de Tal" },
};

describe("SalesService.update nullable fields", () => {
  it("persists null for explicit null or empty schedule and installation dates", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue(beforeSale);
    prisma.sale.update = vi.fn().mockResolvedValue({
      id: "sale-1",
      statusId: "st-a",
      pdvId: "pdv-1",
    });
    await svc.update(
      "sale-1",
      { scheduleDate: "", schedulePeriodId: null, installedAt: null },
      sellerFull,
      ctx,
    );
    const data = prisma.sale.update.mock.calls[0][0].data;
    expect(data.scheduleDate).toBeNull();
    expect(data.schedulePeriodId).toBeNull();
    expect(data.installedAt).toBeNull();
  });

  it("leaves schedule and installation dates unchanged when omitted", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue(beforeSale);
    prisma.sale.update = vi.fn().mockResolvedValue({
      id: "sale-1",
      statusId: "st-a",
      pdvId: "pdv-1",
    });
    await svc.update("sale-1", { notes: "x" }, sellerFull, ctx);
    const data = prisma.sale.update.mock.calls[0][0].data;
    expect(data.scheduleDate).toBeUndefined();
    expect(data.schedulePeriodId).toBeUndefined();
    expect(data.installedAt).toBeUndefined();
  });

  it("switches the plan and prices against the new one", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue(beforeSale);
    prisma.sale.update = vi.fn().mockResolvedValue({
      id: "sale-1",
      statusId: "st-a",
      pdvId: "pdv-1",
    });
    await svc.update("sale-1", { planId: "plan-fix" }, sellerFull, ctx);
    const data = prisma.sale.update.mock.calls[0][0].data;
    expect(data.planId).toBe("plan-fix");
    expect(prisma.plan.findUnique).toHaveBeenCalledWith({ where: { id: "plan-fix" } });
  });

  it("rejects clearing the plan", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue(beforeSale);
    await expect(svc.update("sale-1", { planId: null }, sellerFull, ctx)).rejects.toThrow(
      AppException,
    );
  });

  it("keeps the previous plan FK when that field is omitted", async () => {
    const { svc, prisma } = makeService();
    prisma.sale.findUnique = vi.fn().mockResolvedValue(beforeSale);
    prisma.sale.update = vi.fn().mockResolvedValue({
      id: "sale-1",
      statusId: "st-a",
      pdvId: "pdv-1",
    });
    await svc.update("sale-1", { notes: "x" }, sellerFull, ctx);
    const data = prisma.sale.update.mock.calls[0][0].data;
    expect(data.planId).toBeUndefined();
    expect(prisma.plan.findUnique).toHaveBeenCalledWith({ where: { id: "plan-net" } });
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

describe("SalesService.setAudit", () => {
  const auditor = {
    id: "auditor-1",
    name: "Ciclano",
    isSuperAdmin: false,
    status: "ACTIVE",
    role: { permissions: ["sales.view_all", "sales.audit"] },
  };
  const sale = {
    id: "sale-1",
    sellerId: "seller-1",
    canceledAt: null,
    auditNote: null,
    customer: { name: "Fulana de Tal" },
  };

  function withSale() {
    const bundle = makeService();
    bundle.prisma.sale.findUnique = vi.fn().mockResolvedValue(sale);
    bundle.prisma.sale.update = vi
      .fn()
      .mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...sale, ...args.data }),
      );
    return bundle;
  }

  it("marks the audit as OK and records it", async () => {
    const { svc, prisma, audit } = withSale();
    await svc.setAudit("sale-1", true, auditor, ctx);
    expect(prisma.sale.update.mock.calls[0][0].data).toEqual({ auditNote: "OK" });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Sale",
        action: "UPDATE",
        before: { auditNote: null },
        after: { auditNote: "OK" },
      }),
    );
  });

  it("clears the audit mark", async () => {
    const { svc, prisma } = withSale();
    await svc.setAudit("sale-1", false, auditor, ctx);
    expect(prisma.sale.update.mock.calls[0][0].data).toEqual({ auditNote: null });
  });

  it("rejects a user without sales.audit", async () => {
    const { svc } = withSale();
    await expect(svc.setAudit("sale-1", true, sellerFull, ctx)).rejects.toThrow(AppException);
  });
});

describe("SalesService.setBrscan", () => {
  const auditor = {
    id: "auditor-1",
    name: "Ciclano",
    isSuperAdmin: false,
    status: "ACTIVE",
    role: { permissions: ["sales.view_all", "sales.audit"] },
  };
  const sale = {
    id: "sale-1",
    sellerId: "seller-1",
    canceledAt: null,
    brscan: null,
    customer: { name: "Fulana de Tal" },
  };

  function withSale() {
    const bundle = makeService();
    bundle.prisma.sale.findUnique = vi.fn().mockResolvedValue(sale);
    bundle.prisma.sale.update = vi
      .fn()
      .mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...sale, ...args.data }),
      );
    return bundle;
  }

  it("approves BRScan and records it", async () => {
    const { svc, prisma, audit } = withSale();
    await svc.setBrscan("sale-1", true, auditor, ctx);
    expect(prisma.sale.update.mock.calls[0][0].data).toEqual({ brscan: true });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ before: { brscan: null }, after: { brscan: true } }),
    );
  });

  it("clears BRScan on undo", async () => {
    const { svc, prisma } = withSale();
    await svc.setBrscan("sale-1", false, auditor, ctx);
    expect(prisma.sale.update.mock.calls[0][0].data).toEqual({ brscan: null });
  });

  it("rejects a user without sales.audit", async () => {
    const { svc } = withSale();
    await expect(svc.setBrscan("sale-1", true, sellerFull, ctx)).rejects.toThrow(AppException);
  });
});

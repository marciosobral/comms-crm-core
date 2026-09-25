import { digitsOnly } from "@comms-crm-core/validation";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { assertUnique } from "../logging/assert-unique";
import { ErrorCode } from "../logging/error-codes";
import type { PermissionSubject } from "../permissions/permissions.service";
import { PrismaService } from "../prisma";
import { salesToCsv } from "../sales/sale-csv";
import { humanizeDiff, resolveHistoryReferenceNames } from "../sales/sale-history";
import { SALE_INCLUDE } from "../sales/sale-includes";
import {
  canViewCustomerDocument,
  withVisibleCustomerDocument,
  withVisibleSaleDocument,
} from "./document-visibility";
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto, withSingleDefault } from "./dto";

export type CustomerActor = PermissionSubject & { id: string; name: string };

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListCustomersQuery, actor: CustomerActor) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 12, 100);

    const where: Record<string, unknown> = {};
    if (query.q) {
      const or: object[] = [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
      ];
      const digits = digitsOnly(query.q);
      if (digits.length > 0) {
        or.push(
          { cpfCnpj: { contains: digits } },
          { phone1: { contains: digits } },
          { phone2: { contains: digits } },
        );
      }
      where.OR = or;
    }
    if (query.city || query.state) {
      const some: Record<string, unknown> = {};
      if (query.city) some.city = { contains: query.city, mode: "insensitive" };
      if (query.state) some.state = query.state;
      where.addresses = { some };
    }
    if (query.sellerId) {
      where.sales = { some: { sellerId: query.sellerId } };
    }
    if (query.month) {
      const [year, month] = query.month.split("-").map(Number);
      where.createdAt = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          _count: { select: { sales: true } },
          sales: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
          addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const items = rows.map((row) => {
      const { _count, sales, ...customer } = row;
      return withVisibleCustomerDocument(
        {
          ...customer,
          salesCount: _count.sales,
          lastSaleDate: sales[0]?.date ?? null,
        },
        actor,
      );
    });

    return { items, total, page, perPage };
  }

  async detail(id: string, actor: CustomerActor) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] } },
    });
    if (!customer) {
      throw new AppException(
        ErrorCode.CUSTOMER_NOT_FOUND,
        "Cliente não encontrado",
        HttpStatus.NOT_FOUND,
      );
    }

    const sales = await this.prisma.sale.findMany({
      where: { customerId: id },
      include: SALE_INCLUDE,
      orderBy: { date: "desc" },
    });

    const activeSales = sales.filter((sale) => sale.canceledAt === null);
    const monthlyRevenue = activeSales.reduce((sum, sale) => sum + Number(sale.amount), 0);

    const statusCounts = new Map<string, number>();
    for (const sale of sales) {
      statusCounts.set(sale.status.value, (statusCounts.get(sale.status.value) ?? 0) + 1);
    }

    const latestSale = sales[0] ?? null;

    const saleIds = sales.map((sale) => sale.id);
    const historyEntries = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entity: "Customer", entityId: id },
          { entity: "Sale", entityId: { in: saleIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });
    const nameById = await resolveHistoryReferenceNames(
      this.prisma,
      historyEntries.map((entry) => entry.diff),
    );
    const history = historyEntries.map((entry) => ({
      ...entry,
      diff: humanizeDiff(entry.diff, entry.action, nameById),
    }));

    return {
      customer: withVisibleCustomerDocument(customer, actor),
      summary: {
        totalSales: sales.length,
        activeSales: activeSales.length,
        monthlyRevenue,
        customerSince: customer.createdAt,
      },
      billing: {
        paymentMethod: latestSale?.paymentMethod ?? null,
        dueDay: latestSale?.dueDay ?? null,
        pdv: latestSale?.pdv ?? null,
        bankName: latestSale?.bankName ?? null,
        bankAgency: latestSale?.bankAgency ?? null,
        bankAccount: latestSale?.bankAccount ?? null,
      },
      salesByStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      sales: sales.map((sale) => withVisibleSaleDocument(sale, actor)),
      history,
    };
  }

  async historyCsv(id: string): Promise<string> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new AppException(
        ErrorCode.CUSTOMER_NOT_FOUND,
        "Cliente não encontrado",
        HttpStatus.NOT_FOUND,
      );
    }

    const sales = await this.prisma.sale.findMany({
      where: { customerId: id },
      include: SALE_INCLUDE,
      orderBy: { date: "desc" },
    });

    return salesToCsv(sales);
  }

  async create(dto: CreateCustomerDto, ctx: AuditContext, actor: CustomerActor) {
    await this.assertCpfCnpjFree(dto.cpfCnpj, null);
    const { addresses, ...fields } = dto;
    const customer = await this.prisma.customer.create({
      data: {
        name: fields.name,
        cpfCnpj: fields.cpfCnpj,
        birthDate: fields.birthDate ? new Date(fields.birthDate) : null,
        motherName: fields.motherName ?? null,
        email: fields.email ?? null,
        phone1: fields.phone1 ?? null,
        phone2: fields.phone2 ?? null,
        addresses: addresses?.length ? { create: withSingleDefault(addresses) } : undefined,
      },
      include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] } },
    });
    await this.audit.record({
      entity: "Customer",
      entityId: customer.id,
      action: "CREATE",
      ctx,
      after: { id: customer.id, name: customer.name, cpfCnpj: customer.cpfCnpj },
    });
    return withVisibleCustomerDocument(customer, actor);
  }

  async update(id: string, dto: UpdateCustomerDto, ctx: AuditContext, actor: CustomerActor) {
    const before = await this.prisma.customer.findUniqueOrThrow({ where: { id } });
    const { addresses, birthDate, cpfCnpj, ...rest } = dto;
    const nextCpfCnpj = canViewCustomerDocument(actor) ? cpfCnpj : undefined;
    if (nextCpfCnpj) await this.assertCpfCnpjFree(nextCpfCnpj, id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        cpfCnpj: nextCpfCnpj,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        addresses:
          addresses !== undefined
            ? { deleteMany: {}, create: withSingleDefault(addresses) }
            : undefined,
      },
      include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] } },
    });
    await this.audit.record({
      entity: "Customer",
      entityId: id,
      action: "UPDATE",
      ctx,
      before,
      after: customer,
    });
    return withVisibleCustomerDocument(customer, actor);
  }

  private async assertCpfCnpjFree(cpfCnpj: string, selfId: string | null): Promise<void> {
    const existing = await this.prisma.customer.findUnique({ where: { cpfCnpj } });
    assertUnique(
      existing,
      selfId,
      ErrorCode.CUSTOMER_CPF_TAKEN,
      "Já existe um cliente com esse CPF/CNPJ",
    );
  }
}

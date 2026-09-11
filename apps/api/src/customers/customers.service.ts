import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import { csvField } from "../reports/reports.service";
import { collectReferenceIds, humanizeDiff } from "../sales/sale-history";
import { SALE_INCLUDE } from "../sales/sale-includes";
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto } from "./dto";

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListCustomersQuery) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 12, 100);

    const where: Record<string, unknown> = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { cpfCnpj: { contains: query.q } },
        { phone1: { contains: query.q } },
        { phone2: { contains: query.q } },
        { email: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.city) where.city = { contains: query.city, mode: "insensitive" };
    if (query.state) where.state = query.state;
    if (query.sellerId || query.month) {
      const saleFilter: Record<string, unknown> = {};
      if (query.sellerId) saleFilter.sellerId = query.sellerId;
      if (query.month) {
        const [year, month] = query.month.split("-").map(Number);
        saleFilter.date = {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        };
      }
      where.sales = { some: saleFilter };
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
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const items = rows.map((row) => {
      const { _count, sales, ...customer } = row;
      return {
        ...customer,
        salesCount: _count.sales,
        lastSaleDate: sales[0]?.date ?? null,
      };
    });

    return { items, total, page, perPage };
  }

  async detail(id: string) {
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
    const nameById = await this.resolveHistoryReferenceNames(
      historyEntries.map((entry) => entry.diff),
    );
    const history = historyEntries.map((entry) => ({
      ...entry,
      diff: humanizeDiff(entry.diff, entry.action, nameById),
    }));

    return {
      customer,
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
      sales,
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

    const lines = ["data;cliente;plano;vendedor;status;valor"];
    for (const sale of sales) {
      const data = formatDate(sale.date);
      const cliente = csvField(sale.customer.name);
      const plano = csvField(sale.internetPlan?.name ?? sale.fixedPlan?.name ?? "-");
      const vendedor = csvField(sale.seller.name);
      const status = csvField(sale.status.value);
      const valor = Number(sale.amount).toFixed(2).replace(".", ",");

      lines.push(`${data};${cliente};${plano};${vendedor};${status};${valor}`);
    }

    return lines.join("\n");
  }

  private async resolveHistoryReferenceNames(diffs: unknown[]): Promise<Map<string, string>> {
    const idsByModel = collectReferenceIds(diffs);
    const [domainValues, users, plans] = await Promise.all([
      idsByModel.domainValue.length
        ? this.prisma.domainValue.findMany({
            where: { id: { in: idsByModel.domainValue } },
            select: { id: true, value: true },
          })
        : Promise.resolve([]),
      idsByModel.user.length
        ? this.prisma.user.findMany({
            where: { id: { in: idsByModel.user } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      idsByModel.plan.length
        ? this.prisma.plan.findMany({
            where: { id: { in: idsByModel.plan } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);
    const nameById = new Map<string, string>();
    for (const domainValue of domainValues) nameById.set(domainValue.id, domainValue.value);
    for (const user of users) nameById.set(user.id, user.name);
    for (const plan of plans) nameById.set(plan.id, plan.name);
    return nameById;
  }

  async create(dto: CreateCustomerDto, ctx: AuditContext) {
    await this.assertCpfCnpjFree(dto.cpfCnpj, null);
    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name,
        cpfCnpj: dto.cpfCnpj,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        motherName: dto.motherName ?? null,
        address: dto.address ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        email: dto.email ?? null,
        phone1: dto.phone1 ?? null,
        phone2: dto.phone2 ?? null,
      },
    });
    await this.audit.record({
      entity: "Customer",
      entityId: customer.id,
      action: "CREATE",
      ctx,
      after: { id: customer.id, name: customer.name, cpfCnpj: customer.cpfCnpj },
    });
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, ctx: AuditContext) {
    const before = await this.prisma.customer.findUniqueOrThrow({ where: { id } });
    if (dto.cpfCnpj) await this.assertCpfCnpjFree(dto.cpfCnpj, id);
    const data = {
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    };
    const customer = await this.prisma.customer.update({ where: { id }, data });
    await this.audit.record({
      entity: "Customer",
      entityId: id,
      action: "UPDATE",
      ctx,
      before,
      after: customer,
    });
    return customer;
  }

  private async assertCpfCnpjFree(cpfCnpj: string, selfId: string | null): Promise<void> {
    const existing = await this.prisma.customer.findUnique({ where: { cpfCnpj } });
    if (existing && existing.id !== selfId) {
      throw new AppException(
        ErrorCode.CUSTOMER_CPF_TAKEN,
        "Já existe um cliente com esse CPF/CNPJ",
        HttpStatus.CONFLICT,
      );
    }
  }
}

import { Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma";
import { UpdateCustomerDto } from "./dto";

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(q?: string) {
    return this.prisma.customer.findMany({
      where: q
        ? {
            OR: [{ name: { contains: q, mode: "insensitive" } }, { cpfCnpj: { contains: q } }],
          }
        : undefined,
      orderBy: { name: "asc" },
      include: { _count: { select: { sales: true } } },
    });
  }

  detail(id: string) {
    return this.prisma.customer.findUniqueOrThrow({
      where: { id },
      include: {
        sales: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            amount: true,
            date: true,
            status: { select: { value: true } },
            seller: { select: { name: true } },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto, ctx: AuditContext) {
    const before = await this.prisma.customer.findUniqueOrThrow({ where: { id } });
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
}

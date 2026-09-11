import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainType } from "../../prisma/generated/prisma/client/client";
import { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import { CreateDomainValueDto, UpdateDomainValueDto } from "./dto";

@Injectable()
export class DomainValuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(type?: DomainType) {
    const values = await this.prisma.domainValue.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: "asc" }, { order: "asc" }, { value: "asc" }],
      include: {
        _count: {
          select: {
            salesAsStatus: true,
            salesAsPaymentMethod: true,
            salesAsSystem: true,
            salesAsMailing: true,
            salesAsPdv: true,
          },
        },
      },
    });
    return values.map(({ _count, ...value }) => ({
      ...value,
      salesCount:
        _count.salesAsStatus +
        _count.salesAsPaymentMethod +
        _count.salesAsSystem +
        _count.salesAsMailing +
        _count.salesAsPdv,
    }));
  }

  listActive(type: DomainType) {
    return this.prisma.domainValue.findMany({
      where: { type, active: true },
      orderBy: [{ order: "asc" }, { value: "asc" }],
    });
  }

  async create(dto: CreateDomainValueDto, ctx: AuditContext) {
    const existing = await this.prisma.domainValue.findUnique({
      where: { type_value: { type: dto.type, value: dto.value } },
    });
    if (existing) {
      throw new AppException(
        ErrorCode.DOMAIN_VALUE_DUPLICATE,
        "Valor já cadastrado para este tipo",
        HttpStatus.CONFLICT,
      );
    }
    const max = await this.prisma.domainValue.aggregate({
      where: { type: dto.type },
      _max: { order: true },
    });
    const created = await this.prisma.domainValue.create({
      data: {
        type: dto.type,
        value: dto.value,
        description: dto.description,
        order: (max._max.order ?? 0) + 1,
      },
    });
    await this.audit.record({
      entity: "DomainValue",
      entityId: created.id,
      action: "CREATE",
      ctx,
      after: created,
    });
    return created;
  }

  async update(id: string, dto: UpdateDomainValueDto, ctx: AuditContext) {
    const before = await this.prisma.domainValue.findUniqueOrThrow({ where: { id } });
    const updated = await this.prisma.domainValue.update({ where: { id }, data: dto });
    await this.audit.record({
      entity: "DomainValue",
      entityId: id,
      action: "UPDATE",
      ctx,
      before,
      after: updated,
    });
    return updated;
  }

  async reorder(type: DomainType, ids: string[], ctx: AuditContext) {
    const existing = await this.prisma.domainValue.findMany({
      where: { type },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((value) => value.id));
    const unique = new Set(ids);
    if (
      ids.length !== existing.length ||
      unique.size !== ids.length ||
      ids.some((id) => !existingIds.has(id))
    ) {
      throw new AppException(ErrorCode.INVALID_INPUT, "Lista de ordem incompleta ou inválida");
    }
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.domainValue.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );
    await this.audit.record({
      entity: "DomainValue",
      entityId: type,
      action: "UPDATE",
      ctx,
      after: { ids },
    });
  }
}

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

  list(type?: DomainType) {
    return this.prisma.domainValue.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: "asc" }, { order: "asc" }, { value: "asc" }],
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
    const created = await this.prisma.domainValue.create({
      data: { type: dto.type, value: dto.value, order: dto.order ?? 0 },
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
}

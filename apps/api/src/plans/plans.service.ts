import { Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { assertUnique } from "../logging/assert-unique";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import { CreatePlanDto, UpdatePlanDto } from "./dto";

const PLAN_INCLUDE = { type: { select: { id: true, value: true } } } as const;

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(activeOnly?: boolean) {
    return this.prisma.plan.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: "asc" },
      include: PLAN_INCLUDE,
    });
  }

  async create(dto: CreatePlanDto, ctx: AuditContext) {
    this.assertPriceRange(dto.minPrice, dto.basePrice);
    await this.assertNameFree(dto.name, null);
    await this.assertPlanType(dto.typeId);

    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        typeId: dto.typeId,
        speed: dto.speed ?? null,
        features: dto.features,
        basePrice: dto.basePrice,
        minPrice: dto.minPrice,
        salesScript: dto.salesScript ?? null,
        active: dto.active ?? true,
      },
      include: PLAN_INCLUDE,
    });

    await this.audit.record({
      entity: "Plan",
      entityId: plan.id,
      action: "CREATE",
      ctx,
      after: plan,
    });
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto, ctx: AuditContext) {
    const before = await this.prisma.plan.findUniqueOrThrow({ where: { id } });

    const nextMin = dto.minPrice ?? Number(before.minPrice);
    const nextBase = dto.basePrice ?? Number(before.basePrice);
    this.assertPriceRange(nextMin, nextBase);

    if (dto.name) await this.assertNameFree(dto.name, id);
    if (dto.typeId) await this.assertPlanType(dto.typeId);

    const plan = await this.prisma.plan.update({
      where: { id },
      data: dto,
      include: PLAN_INCLUDE,
    });
    await this.audit.record({
      entity: "Plan",
      entityId: id,
      action: "UPDATE",
      ctx,
      before,
      after: plan,
    });
    return plan;
  }

  async setActive(id: string, active: boolean, ctx: AuditContext) {
    const before = await this.prisma.plan.findUniqueOrThrow({ where: { id } });
    const plan = await this.prisma.plan.update({
      where: { id },
      data: { active },
      include: PLAN_INCLUDE,
    });
    await this.audit.record({
      entity: "Plan",
      entityId: id,
      action: "UPDATE",
      ctx,
      before,
      after: plan,
    });
    return plan;
  }

  private assertPriceRange(minPrice: number, basePrice: number): void {
    if (minPrice > basePrice) {
      throw new AppException(
        ErrorCode.PLAN_PRICE_RANGE_INVALID,
        "Preço mínimo não pode ser maior que o preço base",
      );
    }
  }

  private async assertPlanType(typeId: string): Promise<void> {
    const value = await this.prisma.domainValue.findUnique({ where: { id: typeId } });
    if (!value || value.type !== "PLAN_TYPE" || !value.active) {
      throw new AppException(ErrorCode.DOMAIN_VALUE_INVALID, "Tipo de plano inválido ou inativo");
    }
  }

  private async assertNameFree(name: string, selfId: string | null): Promise<void> {
    const existing = await this.prisma.plan.findUnique({ where: { name } });
    assertUnique(existing, selfId, ErrorCode.PLAN_NAME_TAKEN, "Já existe um plano com esse nome");
  }
}

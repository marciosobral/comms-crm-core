import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import { CreatePlanDto, UpdatePlanDto } from "./dto";

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
    });
  }

  async create(dto: CreatePlanDto, ctx: AuditContext) {
    this.assertPriceRange(dto.minPrice, dto.basePrice);
    await this.assertNameFree(dto.name, null);

    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        type: dto.type,
        speed: dto.speed ?? null,
        features: dto.features,
        basePrice: dto.basePrice,
        minPrice: dto.minPrice,
        salesScript: dto.salesScript ?? null,
        active: dto.active ?? true,
      },
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

    const plan = await this.prisma.plan.update({ where: { id }, data: dto });
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
    const plan = await this.prisma.plan.update({ where: { id }, data: { active } });
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

  private async assertNameFree(name: string, selfId: string | null): Promise<void> {
    const existing = await this.prisma.plan.findUnique({ where: { name } });
    if (existing && existing.id !== selfId) {
      throw new AppException(
        ErrorCode.PLAN_NAME_TAKEN,
        "Já existe um plano com esse nome",
        HttpStatus.CONFLICT,
      );
    }
  }
}

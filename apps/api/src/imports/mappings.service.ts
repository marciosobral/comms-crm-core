import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import { CreateMappingDto } from "./dto";

@Injectable()
export class MappingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const mappings = await this.prisma.importMapping.findMany({ orderBy: { createdAt: "desc" } });
    return Promise.all(
      mappings.map(async (mapping) => ({
        ...mapping,
        targetLabel: await this.targetLabel(mapping.kind, mapping.targetId),
      })),
    );
  }

  private async targetLabel(kind: string, targetId: string): Promise<string | null> {
    if (kind === "USER") {
      const user = await this.prisma.user.findUnique({ where: { id: targetId } });
      return user?.name ?? null;
    }
    if (kind === "DOMAIN") {
      const value = await this.prisma.domainValue.findUnique({ where: { id: targetId } });
      return value?.value ?? null;
    }
    const plan = await this.prisma.plan.findUnique({ where: { id: targetId } });
    return plan?.name ?? null;
  }

  async create(dto: CreateMappingDto, ctx: AuditContext) {
    const sourceValue = dto.sourceValue.trim().toLowerCase();

    const label = await this.targetLabel(dto.kind, dto.targetId);
    if (label === null) {
      throw new AppException(
        ErrorCode.IMPORT_MAPPING_TARGET_INVALID,
        "Alvo do mapeamento não encontrado",
      );
    }

    const domainType = dto.domainType ?? null;

    // Prisma quirk: findUnique may reject domainType: null in composite unique.
    // Fallback to findFirst with the same where clause.
    const existing = await this.prisma.importMapping.findFirst({
      where: {
        kind: dto.kind,
        domainType,
        sourceValue,
      },
    });
    if (existing) {
      throw new AppException(
        ErrorCode.IMPORT_MAPPING_DUPLICATE,
        "Mapeamento já existe",
        HttpStatus.CONFLICT,
      );
    }

    const mapping = await this.prisma.importMapping.create({
      data: {
        kind: dto.kind,
        domainType,
        sourceValue,
        targetId: dto.targetId,
      },
    });
    await this.audit.record({
      entity: "ImportMapping",
      entityId: mapping.id,
      action: "CREATE",
      ctx,
      after: { kind: dto.kind, sourceValue, targetId: dto.targetId },
    });
    return { ...mapping, targetLabel: label };
  }
}

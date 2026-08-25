import { HttpStatus, Injectable } from "@nestjs/common";
import { z } from "zod";
import { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";

const SETTING_SCHEMAS: Record<string, z.ZodTypeAny> = {
  DUE_NOTIFICATION_DAYS: z.array(z.number().int().min(0).max(28)),
  UPLOAD_MAX_MB: z.number().int().min(1).max(500),
};

@Injectable()
export class SystemSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  }

  get(key: string) {
    return this.prisma.systemSetting.findUnique({ where: { key } });
  }

  async update(key: string, value: unknown, ctx: AuditContext) {
    const schema = SETTING_SCHEMAS[key];
    if (!schema) {
      throw new AppException(ErrorCode.SETTING_KEY_UNKNOWN, `Configuração desconhecida: ${key}`);
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.INVALID_INPUT,
        `Valor inválido para ${key}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const before = await this.prisma.systemSetting.findUnique({ where: { key } });
    const updated = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: parsed.data },
      create: { key, value: parsed.data },
    });
    await this.audit.record({
      entity: "SystemSetting",
      entityId: key,
      action: "UPDATE",
      ctx,
      before: before ?? undefined,
      after: updated,
    });
    return updated;
  }
}

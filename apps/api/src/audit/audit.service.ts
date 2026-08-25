import { Injectable } from "@nestjs/common";
import { WinstonLoggerService } from "../logging/winston-logger.service";
import { PrismaService } from "../prisma";
import { AuditContext } from "./audit-context.decorator";
import { computeDiff } from "./diff";

interface RecordInput {
  entity: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  ctx: AuditContext;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async record(input: RecordInput): Promise<void> {
    try {
      const diff = computeDiff(input.before ?? null, input.after ?? null);
      await this.prisma.auditLog.create({
        data: {
          entity: input.entity,
          entityId: input.entityId,
          action: input.action,
          userId: input.ctx.userId || null,
          diff,
          ip: input.ctx.ip,
          userAgent: input.ctx.userAgent,
        },
      });
      this.logger.log(
        `audit ${input.action} ${input.entity}:${input.entityId} by ${input.ctx.userId}`,
        AuditService.name,
      );
    } catch (err) {
      this.logger.error(`audit write failed: ${String(err)}`, undefined, AuditService.name);
    }
  }
}

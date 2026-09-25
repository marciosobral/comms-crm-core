import { HttpStatus, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { z } from "zod";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { WinstonLoggerService } from "../logging/winston-logger.service";
import { PrismaService } from "../prisma";
import { SystemSettingsService } from "../settings";
import { dueTargets, parseDueOffsets } from "./due-date";

const dueNotificationPayloadSchema = z.object({ dueDay: z.number(), offset: z.number() });

function dueNotificationKey(userId: string, dueDay: number, offset: number): string {
  return `${userId}|${dueDay}|${offset}`;
}

function existingDueNotificationKey(userId: string, payload: unknown): string[] {
  const parsed = dueNotificationPayloadSchema.safeParse(payload);
  return parsed.success ? [dueNotificationKey(userId, parsed.data.dueDay, parsed.data.offset)] : [];
}

export interface SaleChangeInput {
  saleId: string;
  customerName: string;
  kind: "status" | "seller" | "cancel" | "update";
  detail: string;
  actorId: string;
  actorName: string;
  sellerId: string;
  previousSellerId?: string | null;
}

export type NotificationActor = { id: string; isSuperAdmin: boolean };

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
    private readonly settings: SystemSettingsService,
  ) {}

  async notifySaleChange(input: SaleChangeInput): Promise<void> {
    try {
      const supervisors = await this.prisma.user.findMany({
        where: { status: "ACTIVE", role: { permissions: { has: "sales.supervise" } } },
        select: { id: true },
      });

      const recipients = new Set<string>();
      recipients.add(input.sellerId);
      if (input.previousSellerId) recipients.add(input.previousSellerId);
      for (const supervisor of supervisors) recipients.add(supervisor.id);
      recipients.delete(input.actorId);

      if (recipients.size === 0) return;

      await this.prisma.notification.createMany({
        data: [...recipients].map((userId) => ({
          userId,
          type: "SALE_CHANGE" as const,
          payload: {
            saleId: input.saleId,
            customerName: input.customerName,
            kind: input.kind,
            detail: input.detail,
            actorName: input.actorName,
          },
        })),
      });
    } catch (error) {
      this.logger.error(
        `notifySaleChange failed: ${String(error)}`,
        undefined,
        NotificationsService.name,
      );
    }
  }

  async listForUser(actor: NotificationActor) {
    const where = actor.isSuperAdmin ? {} : { userId: actor.id };
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async unreadCount(actor: NotificationActor) {
    const where = actor.isSuperAdmin ? { readAt: null } : { userId: actor.id, readAt: null };
    return this.prisma.notification.count({ where });
  }

  async markRead(id: string, actor: NotificationActor) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || (notification.userId !== actor.id && !actor.isSuperAdmin)) {
      throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Notificação não encontrada",
        HttpStatus.NOT_FOUND,
      );
    }
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(actor: NotificationActor) {
    const where = actor.isSuperAdmin ? { readAt: null } : { userId: actor.id, readAt: null };
    return this.prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });
  }

  async runDueCheck(now: Date = new Date()): Promise<{ notified: number }> {
    const setting = await this.settings.get("DUE_NOTIFICATION_DAYS");
    const offsets = parseDueOffsets(setting?.value);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const recipients = await this.prisma.user.findMany({
      where: { status: "ACTIVE", role: { permissions: { has: "notifications.collections" } } },
      select: { id: true },
    });
    const targets = dueTargets(now, offsets);
    if (recipients.length === 0 || targets.length === 0) return { notified: 0 };

    const existing = await this.prisma.notification.findMany({
      where: { type: "DUE_DATE", createdAt: { gte: startOfDay } },
      select: { userId: true, payload: true },
    });
    const existingKeys = new Set(
      existing.flatMap((row) => existingDueNotificationKey(row.userId, row.payload)),
    );

    const toCreate: Array<{
      userId: string;
      type: "DUE_DATE";
      payload: { dueDay: number; count: number; offset: number };
    }> = [];
    for (const target of targets) {
      const count = await this.prisma.sale.count({
        where: { dueDay: target.dueDay, canceledAt: null },
      });
      if (count === 0) continue;

      for (const recipient of recipients) {
        const key = dueNotificationKey(recipient.id, target.dueDay, target.offset);
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        toCreate.push({
          userId: recipient.id,
          type: "DUE_DATE",
          payload: { dueDay: target.dueDay, count, offset: target.offset },
        });
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.notification.createMany({ data: toCreate });
    }
    return { notified: toCreate.length };
  }

  @Cron("0 8 * * *")
  async handleDueCron(): Promise<void> {
    try {
      const result = await this.runDueCheck();
      this.logger.log(`due check: ${result.notified} notifications`, NotificationsService.name);
    } catch (error) {
      this.logger.error(`due check failed: ${String(error)}`, undefined, NotificationsService.name);
    }
  }
}

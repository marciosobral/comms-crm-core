import { HttpStatus, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { WinstonLoggerService } from "../logging/winston-logger.service";
import { PrismaService } from "../prisma";
import { SystemSettingsService } from "../settings";
import { dueTargets, parseDueOffsets } from "./due-date";

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

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        "Notificação não encontrada",
        HttpStatus.NOT_FOUND,
      );
    }
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
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
    if (recipients.length === 0) return { notified: 0 };

    let notified = 0;
    for (const target of dueTargets(now, offsets)) {
      const count = await this.prisma.sale.count({
        where: { dueDay: target.dueDay, canceledAt: null },
      });
      if (count === 0) continue;

      for (const recipient of recipients) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            userId: recipient.id,
            type: "DUE_DATE",
            createdAt: { gte: startOfDay },
            AND: [
              { payload: { path: ["dueDay"], equals: target.dueDay } },
              { payload: { path: ["offset"], equals: target.offset } },
            ],
          },
        });
        if (existing) continue;
        await this.prisma.notification.create({
          data: {
            userId: recipient.id,
            type: "DUE_DATE",
            payload: { dueDay: target.dueDay, count, offset: target.offset },
          },
        });
        notified += 1;
      }
    }
    return { notified };
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

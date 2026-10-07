import { AppException } from "@/logging/app-exception";
import { ErrorCode } from "@/logging/error-codes";
import { WinstonLoggerService } from "@/logging/winston-logger.service";
import type { PermissionKey } from "@/permissions/permission-catalog";
import { PrismaService } from "@/prisma";
import { SystemSettingsService } from "@/settings";
import { BUSINESS_TIME_ZONE, businessDateKey, businessDayStart } from "@comms-crm-core/validation";
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { z } from "zod";
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
  orderNumber: string | null;
  customerName: string;
  kind: "status" | "seller" | "cancel" | "update";
  detail: string;
  changedFields?: string[];
  actorId: string;
  actorName: string;
  sellerId: string;
  previousSellerId?: string | null;
}

export interface NewSaleInput {
  saleId: string;
  orderNumber: string | null;
  customerName: string;
  actorId: string;
  actorName: string;
  sellerId: string;
  sellerName: string;
}

export type NotificationActor = { id: string };

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
    private readonly settings: SystemSettingsService,
  ) {}

  async notifySaleChange(input: SaleChangeInput): Promise<void> {
    try {
      const supervisors = await this.usersWithPermission("notifications.all_sales");

      const recipients = new Set<string>();
      recipients.add(input.sellerId);
      if (input.previousSellerId) recipients.add(input.previousSellerId);
      for (const supervisor of supervisors) recipients.add(supervisor.id);

      await this.prisma.notification.createMany({
        data: [...recipients].map((userId) => ({
          userId,
          type: "SALE_CHANGE" as const,
          payload: {
            saleId: input.saleId,
            orderNumber: input.orderNumber,
            customerName: input.customerName,
            kind: input.kind,
            detail: input.detail,
            changedFields: input.changedFields ?? [],
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

  // The seller always hears about their sale; watchers (all-sales permission or super admin) get
  // the generic version, except the one who registered it, who already knows.
  async notifyNewSale(input: NewSaleInput): Promise<void> {
    try {
      const watchers = await this.usersWithPermission("notifications.all_sales");
      const base = {
        saleId: input.saleId,
        orderNumber: input.orderNumber,
        customerName: input.customerName,
        kind: "create",
        actorName: input.actorName,
        sellerName: input.sellerName,
      };
      const sellerAudience = input.actorId === input.sellerId ? "self" : "seller";
      const rows = [{ userId: input.sellerId, payload: { ...base, audience: sellerAudience } }];
      for (const watcher of watchers) {
        if (watcher.id === input.sellerId || watcher.id === input.actorId) continue;
        rows.push({ userId: watcher.id, payload: { ...base, audience: "watcher" } });
      }

      await this.prisma.notification.createMany({
        data: rows.map((row) => ({ ...row, type: "SALE_CHANGE" as const })),
      });
    } catch (error) {
      this.logger.error(
        `notifyNewSale failed: ${String(error)}`,
        undefined,
        NotificationsService.name,
      );
    }
  }

  private usersWithPermission(key: PermissionKey) {
    return this.prisma.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ isSuperAdmin: true }, { role: { permissions: { has: key } } }],
      },
      select: { id: true },
    });
  }

  async listForUser(actor: NotificationActor) {
    return this.prisma.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async unreadCount(actor: NotificationActor) {
    return this.prisma.notification.count({ where: { userId: actor.id, readAt: null } });
  }

  async markRead(id: string, actor: NotificationActor) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== actor.id) {
      throw new AppException(ErrorCode.NOTIFICATION_NOT_FOUND);
    }
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(actor: NotificationActor) {
    return this.prisma.notification.updateMany({
      where: { userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async runDueCheck(now: Date = new Date()): Promise<{ notified: number }> {
    const setting = await this.settings.get("DUE_NOTIFICATION_DAYS");
    const offsets = parseDueOffsets(setting?.value);
    const todayKey = businessDateKey(now);
    const dayStart = businessDayStart(todayKey);

    const watchers = await this.usersWithPermission("notifications.collections");
    const watcherIds = new Set(watchers.map((watcher) => watcher.id));
    const targets = dueTargets(todayKey, offsets);
    if (targets.length === 0) return { notified: 0 };

    const existing = await this.prisma.notification.findMany({
      where: { type: "DUE_DATE", createdAt: { gte: dayStart } },
      select: { userId: true, payload: true },
    });
    const existingKeys = new Set(
      existing.flatMap((row) => existingDueNotificationKey(row.userId, row.payload)),
    );

    const toCreate: Array<{
      userId: string;
      type: "DUE_DATE";
      payload: { dueDay: number; count: number; offset: number; scope: "all" | "own" };
    }> = [];
    const addDueNotification = (
      userId: string,
      dueDay: number,
      offset: number,
      count: number,
      scope: "all" | "own",
    ) => {
      const key = dueNotificationKey(userId, dueDay, offset);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      toCreate.push({ userId, type: "DUE_DATE", payload: { dueDay, count, offset, scope } });
    };

    for (const target of targets) {
      const where = { dueDay: target.dueDay, canceledAt: null };
      const count = await this.prisma.sale.count({ where });
      if (count === 0) continue;

      for (const watcher of watchers)
        addDueNotification(watcher.id, target.dueDay, target.offset, count, "all");

      const perSeller = await this.prisma.sale.groupBy({
        by: ["sellerId"],
        where: { ...where, seller: { status: "ACTIVE" } },
        _count: { _all: true },
      });
      for (const row of perSeller) {
        if (watcherIds.has(row.sellerId)) continue;
        addDueNotification(row.sellerId, target.dueDay, target.offset, row._count._all, "own");
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.notification.createMany({ data: toCreate });
    }
    return { notified: toCreate.length };
  }

  @Cron("0 8 * * *", { timeZone: BUSINESS_TIME_ZONE })
  async handleDueCron(): Promise<void> {
    try {
      const result = await this.runDueCheck();
      this.logger.log(`due check: ${result.notified} notifications`, NotificationsService.name);
    } catch (error) {
      this.logger.error(`due check failed: ${String(error)}`, undefined, NotificationsService.name);
    }
  }
}

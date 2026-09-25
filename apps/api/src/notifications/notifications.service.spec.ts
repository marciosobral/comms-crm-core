import { describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service";

const baseInput = {
  saleId: "sale-1",
  customerName: "Fulano da Silva",
  kind: "status" as const,
  detail: "GROSS → CANCELADA",
  actorId: "actor-1",
  actorName: "Admin",
  sellerId: "seller-1",
};

function makeService(supervisors: Array<{ id: string }> = [{ id: "sup-1" }]) {
  const prisma = {
    user: {
      findMany: vi.fn().mockResolvedValue(supervisors),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    sale: {
      count: vi.fn().mockResolvedValue(0),
    },
  };
  const logger = { error: vi.fn(), log: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const settings = { get: vi.fn().mockResolvedValue({ value: [0, 1] }) };
  const svc = new NotificationsService(
    prisma as unknown as ConstructorParameters<typeof NotificationsService>[0],
    logger as unknown as ConstructorParameters<typeof NotificationsService>[1],
    settings as unknown as ConstructorParameters<typeof NotificationsService>[2],
  );
  return { svc, prisma, settings };
}

function recipientIds(prisma: ReturnType<typeof makeService>["prisma"]): string[] {
  const rows = prisma.notification.createMany.mock.calls[0][0].data as Array<{ userId: string }>;
  return rows.map((row) => row.userId).sort();
}

describe("NotificationsService.notifySaleChange", () => {
  it("notifies the seller and role-based supervisors, never the actor", async () => {
    const { svc, prisma } = makeService([{ id: "sup-1" }, { id: "actor-1" }]);
    await svc.notifySaleChange(baseInput);
    expect(recipientIds(prisma)).toEqual(["seller-1", "sup-1"]);
  });

  it("notifies previous and new seller on a seller change", async () => {
    const { svc, prisma } = makeService([]);
    await svc.notifySaleChange({
      ...baseInput,
      kind: "seller",
      sellerId: "new-seller",
      previousSellerId: "old-seller",
    });
    expect(recipientIds(prisma)).toEqual(["new-seller", "old-seller"]);
  });

  it("does not notify the seller when the seller is the actor", async () => {
    const { svc, prisma } = makeService([]);
    await svc.notifySaleChange({ ...baseInput, sellerId: "actor-1" });
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it("queries only active users with sales.supervise in role permissions", async () => {
    const { svc, prisma } = makeService();
    await svc.notifySaleChange(baseInput);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      status: "ACTIVE",
      role: { permissions: { has: "sales.supervise" } },
    });
  });

  it("never throws on prisma failure", async () => {
    const { svc, prisma } = makeService();
    prisma.notification.createMany = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(svc.notifySaleChange(baseInput)).resolves.toBeUndefined();
  });
});

describe("NotificationsService.listForUser", () => {
  it("lists only the caller's notifications", async () => {
    const { svc, prisma } = makeService();
    await svc.listForUser({ id: "me", isSuperAdmin: false });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "me" } }),
    );
  });

  it("lists every notification for a super admin", async () => {
    const { svc, prisma } = makeService();
    await svc.listForUser({ id: "admin", isSuperAdmin: true });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

describe("NotificationsService.unreadCount", () => {
  it("counts only the caller's unread notifications", async () => {
    const { svc, prisma } = makeService();
    await svc.unreadCount({ id: "me", isSuperAdmin: false });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "me", readAt: null },
    });
  });

  it("counts every unread notification for a super admin", async () => {
    const { svc, prisma } = makeService();
    await svc.unreadCount({ id: "admin", isSuperAdmin: true });
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { readAt: null } });
  });
});

describe("NotificationsService.markRead", () => {
  it("throws 404 when the notification belongs to another user", async () => {
    const { svc, prisma } = makeService();
    prisma.notification.findUnique = vi
      .fn()
      .mockResolvedValue({ id: "n-1", userId: "someone-else" });
    await expect(svc.markRead("n-1", { id: "me", isSuperAdmin: false })).rejects.toThrow();
  });

  it("marks own notification read", async () => {
    const { svc, prisma } = makeService();
    prisma.notification.findUnique = vi.fn().mockResolvedValue({ id: "n-1", userId: "me" });
    await svc.markRead("n-1", { id: "me", isSuperAdmin: false });
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "n-1" } }),
    );
  });
  it("allows a super admin to mark another user's notification", async () => {
    const { svc, prisma } = makeService();
    prisma.notification.findUnique = vi
      .fn()
      .mockResolvedValue({ id: "n-1", userId: "someone-else" });
    await svc.markRead("n-1", { id: "admin", isSuperAdmin: true });
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "n-1" } }),
    );
  });
});

describe("NotificationsService.markAllRead", () => {
  it("marks only the caller's unread notifications", async () => {
    const { svc, prisma } = makeService();
    await svc.markAllRead({ id: "me", isSuperAdmin: false });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "me", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("marks every unread notification for a super admin", async () => {
    const { svc, prisma } = makeService();
    await svc.markAllRead({ id: "admin", isSuperAdmin: true });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe("NotificationsService.runDueCheck", () => {
  it("notifies collections users for matching due days and dedupes same-day repeats", async () => {
    const { svc, prisma } = makeService([]);
    prisma.user.findMany = vi.fn().mockResolvedValue([{ id: "cob-1" }]);
    prisma.sale.count = vi.fn().mockResolvedValue(3);
    prisma.notification.findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: "already" });
    prisma.notification.create = vi.fn().mockResolvedValue({});
    const result = await svc.runDueCheck(new Date(2026, 5, 9));
    expect(result.notified).toBe(1);
    const payload = prisma.notification.create.mock.calls[0][0].data.payload;
    expect(payload).toEqual({ dueDay: 9, count: 3, offset: 0 });
  });

  it("skips days with zero matching sales", async () => {
    const { svc, prisma } = makeService([]);
    prisma.user.findMany = vi.fn().mockResolvedValue([{ id: "cob-1" }]);
    prisma.sale.count = vi.fn().mockResolvedValue(0);
    prisma.notification.create = vi.fn().mockResolvedValue({});
    const result = await svc.runDueCheck(new Date(2026, 5, 9));
    expect(result.notified).toBe(0);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

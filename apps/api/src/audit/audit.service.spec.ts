import { describe, expect, it, vi } from "vitest";
import { ChangeEventsService } from "../change-events/change-events.service";
import { AuditService } from "./audit.service";

const ctx = { userId: "u1", ip: null, userAgent: null };
const logger = { error: vi.fn(), log: vi.fn(), warn: vi.fn(), debug: vi.fn() };

function makeService(create: () => Promise<unknown>) {
  const prisma = { auditLog: { create: vi.fn(create) } };
  const changeEvents = new ChangeEventsService();
  const published: unknown[] = [];
  changeEvents.stream().subscribe((change) => published.push(change));
  const svc = new AuditService(
    prisma as unknown as ConstructorParameters<typeof AuditService>[0],
    logger as unknown as ConstructorParameters<typeof AuditService>[1],
    changeEvents,
  );
  return { svc, published };
}

describe("AuditService.record change events", () => {
  it("announces the changed entity after recording it", async () => {
    const { svc, published } = makeService(() => Promise.resolve({}));
    await svc.record({ entity: "Role", entityId: "role-1", action: "CREATE", ctx });
    expect(published).toEqual([{ entity: "Role" }]);
  });

  it("still announces the change when the audit write fails", async () => {
    const { svc, published } = makeService(() => Promise.reject(new Error("db down")));
    await svc.record({ entity: "Sale", entityId: "sale-1", action: "UPDATE", ctx });
    expect(published).toEqual([{ entity: "Sale" }]);
  });
});

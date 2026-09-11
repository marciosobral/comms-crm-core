import { describe, expect, it } from "vitest";
import {
  notificationBadgeStatus,
  notificationSubtitle,
  notificationTitle,
} from "./notification-text";

describe("notification-text", () => {
  it("formats a sale status change", () => {
    const notification = {
      id: "n1",
      type: "SALE_CHANGE" as const,
      payload: {
        actorName: "Admin",
        kind: "status",
        detail: "GROSS → CANCELADA",
        customerName: "Beltrana",
        saleId: "sale-1",
      },
      readAt: null,
      createdAt: "2026-08-30T00:00:00Z",
    };

    expect(notificationBadgeStatus(notification)).toBe("venda");
    expect(notificationTitle(notification)).toBe("Status alterado para CANCELADA");
    expect(notificationSubtitle(notification)).toBe("Venda sale-1 - Beltrana · por Admin");
  });

  it("formats a seller change", () => {
    const notification = {
      id: "n2",
      type: "SALE_CHANGE" as const,
      payload: {
        actorName: "Admin",
        kind: "seller",
        detail: "Rodrigo → Patrícia",
        customerName: "Beltrana",
        saleId: "sale-2",
      },
      readAt: null,
      createdAt: "2026-08-30T00:00:00Z",
    };

    expect(notificationTitle(notification)).toBe("Vendedor alterado de Rodrigo para Patrícia");
  });

  it("formats a due date alert", () => {
    const notification = {
      id: "n3",
      type: "DUE_DATE" as const,
      payload: { dueDay: 10, count: 3, offset: 1 },
      readAt: null,
      createdAt: "2026-08-30T00:00:00Z",
    };

    expect(notificationBadgeStatus(notification)).toBe("vencimento");
    expect(notificationTitle(notification)).toBe("Amanhã é dia 10: 3 clientes com vencimento");
  });
});

import { describe, expect, it } from "vitest";
import {
  dueDateOffsetLabel,
  notificationBadgeStatus,
  notificationSaleId,
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
    expect(notificationSubtitle(notification)).toBe("Beltrana · por Admin");
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

  it("lists the edited fields and shows the order number instead of the sale id", () => {
    const notification = {
      id: "n3",
      type: "SALE_CHANGE" as const,
      payload: {
        actorName: "Admin",
        kind: "update",
        detail: "Venda editada",
        changedFields: ["amount", "dueDay", "notes", "installedAt", "updatedAt"],
        customerName: "Beltrana",
        orderNumber: "OV-1",
        saleId: "sale-1",
      },
      readAt: null,
      createdAt: "2026-08-30T00:00:00Z",
    };

    expect(notificationTitle(notification)).toBe(
      "Venda editada: Valor, Vencimento, Observações e mais 1",
    );
    expect(notificationSubtitle(notification)).toBe("OV-1 · Beltrana · por Admin");
    expect(notificationSaleId(notification)).toBe("sale-1");
  });

  it("keeps the plain title for older edits without changed fields", () => {
    const notification = {
      id: "n4",
      type: "SALE_CHANGE" as const,
      payload: { kind: "update", detail: "Venda editada", customerName: "Beltrana" },
      readAt: null,
      createdAt: "2026-08-30T00:00:00Z",
    };
    expect(notificationTitle(notification)).toBe("Venda editada");
  });

  it("formats a new sale for each audience", () => {
    const newSale = (audience: string) => ({
      id: `n-${audience}`,
      type: "SALE_CHANGE" as const,
      payload: {
        kind: "create",
        audience,
        orderNumber: "OV-9",
        customerName: "Fulano de Tal",
        actorName: "Ciclano",
        sellerName: "Beltrana",
        saleId: "sale-9",
      },
      readAt: null,
      createdAt: "2026-10-01T00:00:00Z",
    });

    expect(notificationTitle(newSale("self"))).toBe("Você realizou uma nova venda");
    expect(notificationSubtitle(newSale("self"))).toBe("OV-9 · Fulano de Tal");
    expect(notificationTitle(newSale("seller"))).toBe(
      "Nova venda registrada em seu nome por Ciclano",
    );
    expect(notificationTitle(newSale("watcher"))).toBe("Nova venda realizada");
    expect(notificationSubtitle(newSale("watcher"))).toBe(
      "OV-9 · Fulano de Tal · vendedor Beltrana",
    );
    expect(notificationSaleId(newSale("watcher"))).toBe("sale-9");
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

describe("dueDateOffsetLabel", () => {
  it("labels today, tomorrow and later offsets", () => {
    expect(dueDateOffsetLabel(0)).toBe("Hoje");
    expect(dueDateOffsetLabel(1)).toBe("Amanhã");
    expect(dueDateOffsetLabel(3)).toBe("Em 3 dias");
  });
});

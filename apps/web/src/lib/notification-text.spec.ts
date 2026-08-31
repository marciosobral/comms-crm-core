import { describe, expect, it } from "vitest";
import { notificationText } from "./notification-text";

describe("notificationText", () => {
  it("formats a sale change", () => {
    expect(
      notificationText({
        id: "n1",
        type: "SALE_CHANGE",
        payload: {
          actorName: "Admin",
          kind: "status",
          detail: "GROSS → CANCELADA",
          customerName: "Beltrana",
        },
        readAt: null,
        createdAt: "2026-08-30T00:00:00Z",
      }),
    ).toBe("Admin — Status alterado: GROSS → CANCELADA (Beltrana)");
  });

  it("formats a due date alert", () => {
    expect(
      notificationText({
        id: "n2",
        type: "DUE_DATE",
        payload: { dueDay: 10, count: 3, offset: 1 },
        readAt: null,
        createdAt: "2026-08-30T00:00:00Z",
      }),
    ).toBe("Vencimento dia 10: 3 cliente(s) para cobrar");
  });
});

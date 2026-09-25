import { describe, expect, it } from "vitest";
import { canViewAllSales, visibleSaleWhere } from "./sale-visibility";

const restricted = { id: "u1", isSuperAdmin: false, status: "ACTIVE", role: { permissions: [] } };
const privileged = {
  id: "u2",
  isSuperAdmin: false,
  status: "ACTIVE",
  role: { permissions: ["sales.view_all"] },
};
const admin = { id: "u3", isSuperAdmin: true, status: "ACTIVE", role: null };

describe("canViewAllSales", () => {
  it("is false without the permission", () => {
    expect(canViewAllSales(restricted)).toBe(false);
  });

  it("is true with sales.view_all", () => {
    expect(canViewAllSales(privileged)).toBe(true);
  });

  it("is true for a super admin regardless of permissions", () => {
    expect(canViewAllSales(admin)).toBe(true);
  });
});

describe("visibleSaleWhere", () => {
  it("restricts the where clause to the actor's own sales", () => {
    expect(visibleSaleWhere(restricted)).toEqual({ sellerId: "u1" });
  });

  it("leaves the where clause unrestricted for someone who can view all sales", () => {
    expect(visibleSaleWhere(privileged)).toEqual({});
  });
});

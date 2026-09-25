import { describe, expect, it } from "vitest";
import { AppException } from "../logging/app-exception";
import { PermissionsService } from "./permissions.service";

const svc = new PermissionsService();
const activeWith = (permissions: string[]) => ({
  isSuperAdmin: false,
  status: "ACTIVE",
  role: { permissions },
});

describe("PermissionsService.check", () => {
  it("allows super admin regardless of role", () => {
    expect(() =>
      svc.check({ isSuperAdmin: true, status: "ACTIVE", role: null }, ["roles.manage"]),
    ).not.toThrow();
  });

  it("allows when role has all required keys", () => {
    expect(() =>
      svc.check(activeWith(["sales.create", "customers.view"]), ["sales.create"]),
    ).not.toThrow();
  });

  it("denies when a key is missing", () => {
    expect(() => svc.check(activeWith(["sales.create"]), ["sales.edit"])).toThrow(AppException);
  });

  it("denies user without role", () => {
    expect(() =>
      svc.check({ isSuperAdmin: false, status: "ACTIVE", role: null }, ["sales.create"]),
    ).toThrow(AppException);
  });

  it("denies inactive user even with permission", () => {
    expect(() =>
      svc.check(
        { isSuperAdmin: false, status: "BLOCKED", role: { permissions: ["sales.create"] } },
        ["sales.create"],
      ),
    ).toThrow(AppException);
  });
});

describe("PermissionsService.has", () => {
  it("returns true for super admin regardless of role", () => {
    expect(svc.has({ isSuperAdmin: true, status: "ACTIVE", role: null }, "roles.manage")).toBe(
      true,
    );
  });

  it("returns true when the role grants the key", () => {
    expect(svc.has(activeWith(["sales.create"]), "sales.create")).toBe(true);
  });

  it("returns false when the key is missing", () => {
    expect(svc.has(activeWith(["sales.create"]), "sales.edit")).toBe(false);
  });

  it("returns false for an inactive user even with the permission", () => {
    expect(
      svc.has(
        { isSuperAdmin: false, status: "BLOCKED", role: { permissions: ["sales.create"] } },
        "sales.create",
      ),
    ).toBe(false);
  });
});

describe("PermissionsService.assertKnownKeys", () => {
  it("accepts catalog keys", () => {
    expect(() => svc.assertKnownKeys(["sales.create", "roles.manage"])).not.toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() => svc.assertKnownKeys(["sales.create", "foo.bar"])).toThrow(AppException);
  });
});

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

describe("PermissionsService.assertKnownKeys", () => {
  it("accepts catalog keys", () => {
    expect(() => svc.assertKnownKeys(["sales.create", "roles.manage"])).not.toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() => svc.assertKnownKeys(["sales.create", "foo.bar"])).toThrow(AppException);
  });
});

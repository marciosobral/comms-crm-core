import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";

describe("hasPermission", () => {
  it("allows super admin everything", () => {
    expect(hasPermission({ isSuperAdmin: true, permissions: [] }, "plans.manage")).toBe(true);
  });

  it("allows when the key is granted", () => {
    expect(
      hasPermission({ isSuperAdmin: false, permissions: ["plans.manage"] }, "plans.manage"),
    ).toBe(true);
  });

  it("denies when the key is missing", () => {
    expect(
      hasPermission({ isSuperAdmin: false, permissions: ["sales.create"] }, "plans.manage"),
    ).toBe(false);
  });

  it("denies when there is no user", () => {
    expect(hasPermission(null, "plans.manage")).toBe(false);
  });

  it("treats the wildcard from the API as full access", () => {
    expect(hasPermission({ isSuperAdmin: false, permissions: ["*"] }, "plans.manage")).toBe(true);
  });
});

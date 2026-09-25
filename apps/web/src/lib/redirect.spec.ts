import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it("keeps an internal path with its query string", () => {
    expect(safeRedirectPath("/vendas?page=2")).toBe("/vendas?page=2");
  });

  it("rejects external and protocol-relative targets", () => {
    expect(safeRedirectPath("https://example.com")).toBeUndefined();
    expect(safeRedirectPath("//example.com")).toBeUndefined();
    expect(safeRedirectPath("/\\example.com")).toBeUndefined();
    expect(safeRedirectPath("/\t/example.com")).toBeUndefined();
  });

  it("rejects the login page itself and non-string values", () => {
    expect(safeRedirectPath("/login")).toBeUndefined();
    expect(safeRedirectPath("/vendas/../login")).toBeUndefined();
    expect(safeRedirectPath(undefined)).toBeUndefined();
    expect(safeRedirectPath(42)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { formatBRL, parsePrice } from "./format";

describe("formatBRL", () => {
  it("formats a decimal string from the API", () => {
    expect(formatBRL("119.9")).toBe("R$\u{00a0}119,90");
  });

  it("formats a number", () => {
    expect(formatBRL(79.9)).toBe("R$\u{00a0}79,90");
  });
});

describe("parsePrice", () => {
  it("accepts comma as decimal separator", () => {
    expect(parsePrice("119,90")).toBe(119.9);
  });

  it("accepts dot as decimal separator", () => {
    expect(parsePrice("119.90")).toBe(119.9);
  });

  it("returns NaN for garbage", () => {
    expect(Number.isNaN(parsePrice("abc"))).toBe(true);
  });
});

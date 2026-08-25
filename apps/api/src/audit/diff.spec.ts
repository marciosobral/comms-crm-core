import { describe, expect, it } from "vitest";
import { computeDiff } from "./diff";

describe("computeDiff", () => {
  it("returns only changed fields with from/to", () => {
    const before = { amount: "109.99", statusId: "a", obs: null };
    const after = { amount: "119.90", statusId: "a", obs: "ligou" };
    expect(computeDiff(before, after)).toEqual({
      amount: { from: "109.99", to: "119.90" },
      obs: { from: null, to: "ligou" },
    });
  });

  it("ignores updatedAt", () => {
    const before = { updatedAt: new Date("2026-01-01"), name: "A" };
    const after = { updatedAt: new Date("2026-02-01"), name: "A" };
    expect(computeDiff(before, after)).toEqual({});
  });

  it("serializes dates for comparison", () => {
    const before = { data: new Date("2026-06-01T00:00:00Z") };
    const after = { data: new Date("2026-06-02T00:00:00Z") };
    expect(computeDiff(before, after)).toEqual({
      data: { from: "2026-06-01T00:00:00.000Z", to: "2026-06-02T00:00:00.000Z" },
    });
  });

  it("handles CREATE (before null) as all-to", () => {
    expect(computeDiff(null, { name: "X" })).toEqual({ name: { from: null, to: "X" } });
  });

  it("handles DELETE (after null) as all-from", () => {
    expect(computeDiff({ name: "X" }, null)).toEqual({ name: { from: "X", to: null } });
  });

  it("serializes arrays as JSON", () => {
    const before = { permissions: ["a"] };
    const after = { permissions: ["a", "b"] };
    expect(computeDiff(before, after)).toEqual({
      permissions: { from: '["a"]', to: '["a","b"]' },
    });
  });
});

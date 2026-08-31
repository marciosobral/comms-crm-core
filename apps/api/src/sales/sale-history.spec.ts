import { describe, expect, it } from "vitest";
import { collectReferenceIds, humanizeDiff } from "./sale-history";

describe("collectReferenceIds", () => {
  it("groups reference-field ids by the model they resolve against", () => {
    const diffs = [
      { statusId: { from: "st-1", to: "st-2" }, sellerId: { from: null, to: "user-1" } },
      { internetPlanId: { from: "plan-1", to: null }, amount: { from: "99.9", to: "119.9" } },
    ];
    expect(collectReferenceIds(diffs)).toEqual({
      domainValue: ["st-1", "st-2"],
      user: ["user-1"],
      plan: ["plan-1"],
    });
  });

  it("ignores non-diff entries", () => {
    expect(collectReferenceIds([null, "not a diff", 42])).toEqual({
      domainValue: [],
      user: [],
      plan: [],
    });
  });
});

describe("humanizeDiff", () => {
  it("drops the id field on CREATE entries", () => {
    const diff = { id: { from: null, to: "sale-1" }, amount: { from: null, to: "99.9" } };
    expect(humanizeDiff(diff, "CREATE", new Map())).toEqual({
      amount: { from: null, to: "99.9" },
    });
  });

  it("keeps the id field on UPDATE entries", () => {
    const diff = { id: { from: "a", to: "b" } };
    expect(humanizeDiff(diff, "UPDATE", new Map())).toEqual({
      id: { from: "a", to: "b" },
    });
  });

  it("resolves reference-field ids to names", () => {
    const diff = { statusId: { from: "st-1", to: "st-2" }, sellerId: { from: null, to: "user-1" } };
    const nameById = new Map([
      ["st-1", "GROSS"],
      ["st-2", "CANCELADA"],
      ["user-1", "Beltrana Souza"],
    ]);
    expect(humanizeDiff(diff, "UPDATE", nameById)).toEqual({
      statusId: { from: "GROSS", to: "CANCELADA" },
      sellerId: { from: null, to: "Beltrana Souza" },
    });
  });

  it("falls back to a dash for unresolvable reference ids", () => {
    const diff = { sellerId: { from: null, to: "unknown-user" } };
    expect(humanizeDiff(diff, "UPDATE", new Map())).toEqual({
      sellerId: { from: null, to: "—" },
    });
  });

  it("leaves non-reference fields untouched", () => {
    const diff = { cancelReason: { from: null, to: "Cliente desistiu" } };
    expect(humanizeDiff(diff, "UPDATE", new Map())).toEqual({
      cancelReason: { from: null, to: "Cliente desistiu" },
    });
  });

  it("returns null for a missing or malformed diff", () => {
    expect(humanizeDiff(null, "CREATE", new Map())).toBeNull();
    expect(humanizeDiff("not a diff", "CREATE", new Map())).toBeNull();
  });
});

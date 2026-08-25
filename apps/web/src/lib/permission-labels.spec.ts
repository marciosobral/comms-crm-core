import { describe, expect, it } from "vitest";
import { PERMISSION_GROUPS } from "./permission-labels";
import { PERMISSION_KEYS } from "./permissions";

describe("PERMISSION_GROUPS", () => {
  it("covers every permission key exactly once", () => {
    const keys = PERMISSION_GROUPS.flatMap((group) => group.keys.map((entry) => entry.key));
    expect([...keys].sort()).toEqual([...PERMISSION_KEYS].sort());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has pt-BR labels for every entry", () => {
    for (const group of PERMISSION_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0);
      for (const entry of group.keys) {
        expect(entry.label.length).toBeGreaterThan(0);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { findPersonName } from "./person-options";

describe("findPersonName", () => {
  const options = [{ id: "u1", name: "Fulano de Tal" }];

  it("finds the person among the options", () => {
    expect(findPersonName(options, null, "u1")).toBe("Fulano de Tal");
  });

  it("falls back to the current person when not in the options", () => {
    expect(findPersonName(options, { id: "u2", name: "Beltrana" }, "u2")).toBe("Beltrana");
  });

  it("returns null when nobody matches", () => {
    expect(findPersonName(options, null, "u3")).toBeNull();
  });
});

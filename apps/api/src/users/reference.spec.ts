import { describe, expect, it } from "vitest";
import { nextReference, normalizeReference } from "./reference";

describe("nextReference", () => {
  it("starts at 0001 when there are no users", () => {
    expect(nextReference([])).toBe("0001");
  });

  it("increments the highest numeric reference", () => {
    expect(nextReference(["0001", "0003"])).toBe("0004");
  });

  it("ignores non-numeric leftovers when computing the next value", () => {
    expect(nextReference(["FFJE", "0002"])).toBe("0003");
  });
});

describe("normalizeReference", () => {
  it("pads a bare number to 4 digits", () => {
    expect(normalizeReference("1")).toBe("0001");
  });

  it("strips leading zeros before padding", () => {
    expect(normalizeReference("01")).toBe("0001");
    expect(normalizeReference("0001")).toBe("0001");
  });
});

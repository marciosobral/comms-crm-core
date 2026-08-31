import { describe, expect, it } from "vitest";
import { dueTargets, parseDueOffsets } from "./due-date";

describe("dueTargets", () => {
  it("maps offsets to day-of-month, crossing month ends", () => {
    expect(dueTargets(new Date(2026, 7, 30), [0, 1, 2])).toEqual([
      { offset: 0, dueDay: 30 },
      { offset: 1, dueDay: 31 },
      { offset: 2, dueDay: 1 },
    ]);
  });

  it("handles the plain mid-month case", () => {
    expect(dueTargets(new Date(2026, 5, 9), [1])).toEqual([{ offset: 1, dueDay: 10 }]);
  });
});

describe("parseDueOffsets", () => {
  it("accepts a valid int array", () => {
    expect(parseDueOffsets([0, 1, 3])).toEqual([0, 1, 3]);
  });

  it("filters invalid entries and falls back to default when empty or not an array", () => {
    expect(parseDueOffsets([0, 1.5, -2, 40])).toEqual([0]);
    expect(parseDueOffsets("nope")).toEqual([0, 1]);
    expect(parseDueOffsets(undefined)).toEqual([0, 1]);
    expect(parseDueOffsets([])).toEqual([0, 1]);
  });
});

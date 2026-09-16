import { describe, expect, it } from "vitest";
import { joinSchedule, localDatePart, localTimePart } from "./sale-schedule";

describe("joinSchedule", () => {
  it("composes local ISO start and end from date and time window", () => {
    expect(joinSchedule("2026-06-02", "10:00", "12:00")).toEqual({
      scheduleStart: "2026-06-02T10:00:00",
      scheduleEnd: "2026-06-02T12:00:00",
    });
  });

  it("uses midnight start and null end when only the date is set", () => {
    expect(joinSchedule("2026-06-11", "", "")).toEqual({
      scheduleStart: "2026-06-11T00:00:00",
      scheduleEnd: null,
    });
  });

  it("returns an empty object when the date is missing", () => {
    expect(joinSchedule("", "10:00", "12:00")).toEqual({});
  });
});

describe("localDatePart / localTimePart", () => {
  it("round-trips a local wall clock through UTC ISO", () => {
    const iso = new Date(2026, 8, 20, 9, 0, 0).toISOString();
    expect(localDatePart(iso)).toBe("2026-09-20");
    expect(localTimePart(iso)).toBe("09:00");
  });

  it("returns empty strings for missing values", () => {
    expect(localDatePart(undefined)).toBe("");
    expect(localTimePart(null)).toBe("");
  });
});

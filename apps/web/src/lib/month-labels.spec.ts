import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { monthOptions, monthToRange } from "./month-labels";

describe("monthOptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current month first, going backwards", () => {
    const options = monthOptions(3);
    expect(options).toEqual([
      { value: "2026-03", label: "Março/2026" },
      { value: "2026-02", label: "Fevereiro/2026" },
      { value: "2026-01", label: "Janeiro/2026" },
    ]);
  });

  it("crosses the year boundary", () => {
    vi.setSystemTime(new Date(2026, 0, 10));
    const options = monthOptions(2);
    expect(options).toEqual([
      { value: "2026-01", label: "Janeiro/2026" },
      { value: "2025-12", label: "Dezembro/2025" },
    ]);
  });
});

describe("monthToRange", () => {
  it("spans the whole month", () => {
    expect(monthToRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("handles a 31-day month", () => {
    expect(monthToRange("2026-01")).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });
});

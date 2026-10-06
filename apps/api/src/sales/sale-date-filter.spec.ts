import { describe, expect, it } from "vitest";
import { saleDateWhere } from "./sale-date-filter";

describe("saleDateWhere", () => {
  it("filters by the sale date by default", () => {
    expect(saleDateWhere(undefined, "2026-08-01", "2026-08-31")).toEqual({
      date: { gte: new Date("2026-08-01"), lte: new Date("2026-08-31") },
    });
  });

  it("adds no filter for the sale date without a period", () => {
    expect(saleDateWhere("sale")).toEqual({});
  });

  it("filters by the installation date", () => {
    expect(saleDateWhere("installation", "2026-10-01", "2026-10-31")).toEqual({
      installedAt: { gte: new Date("2026-10-01"), lte: new Date("2026-10-31") },
    });
  });

  it("only considers installed sales without a period", () => {
    expect(saleDateWhere("installation")).toEqual({ installedAt: { not: null } });
  });
});

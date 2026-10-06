import { describe, expect, it } from "vitest";
import { containsInsensitive } from "./prisma-filters";

describe("containsInsensitive", () => {
  it("builds a case-insensitive contains filter", () => {
    expect(containsInsensitive("fulano")).toEqual({ contains: "fulano", mode: "insensitive" });
  });
});

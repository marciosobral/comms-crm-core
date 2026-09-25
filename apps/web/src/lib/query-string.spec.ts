import { describe, expect, it } from "vitest";
import { toQueryString } from "./query-string";

describe("toQueryString", () => {
  it("returns an empty string when there are no params", () => {
    expect(toQueryString({})).toBe("");
  });

  it("omits undefined and empty string values", () => {
    expect(toQueryString({ q: "", city: undefined, page: 1 })).toBe("?page=1");
  });

  it("serializes multiple params in insertion order", () => {
    expect(toQueryString({ q: "joao", page: 2, perPage: 10 })).toBe("?q=joao&page=2&perPage=10");
  });

  it("stringifies non-string values", () => {
    expect(toQueryString({ page: 3 })).toBe("?page=3");
  });
});

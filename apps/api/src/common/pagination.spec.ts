import { describe, expect, it } from "vitest";
import { MAX_PER_PAGE, pageWindow } from "./pagination";

describe("pageWindow", () => {
  it("defaults to the first page and the given page size", () => {
    expect(pageWindow({}, 20)).toEqual({ page: 1, perPage: 20, skip: 0, take: 20 });
  });

  it("skips the previous pages", () => {
    expect(pageWindow({ page: 3, perPage: 12 }, 20)).toEqual({
      page: 3,
      perPage: 12,
      skip: 24,
      take: 12,
    });
  });

  it("caps the page size", () => {
    expect(pageWindow({ perPage: 500 }, 20).perPage).toBe(MAX_PER_PAGE);
  });
});

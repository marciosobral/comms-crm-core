import { describe, expect, it } from "vitest";
import { commitTag } from "./commit-tag";

describe("commitTag", () => {
  it("adds a trimmed tag", () => {
    expect(commitTag([], "  Wi-Fi 6  ")).toEqual(["Wi-Fi 6"]);
  });

  it("ignores empty and duplicate tags", () => {
    const tags = ["Wi-Fi 6"];
    expect(commitTag(tags, "   ")).toBe(tags);
    expect(commitTag(tags, "Wi-Fi 6")).toBe(tags);
  });
});

import { describe, expect, it } from "vitest";
import { megabytes } from "./sizes";

describe("megabytes", () => {
  it("converts megabytes to bytes", () => {
    expect(megabytes(1)).toBe(1_048_576);
    expect(megabytes(20)).toBe(20_971_520);
  });
});

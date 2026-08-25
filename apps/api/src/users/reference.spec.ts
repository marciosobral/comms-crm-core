import { describe, expect, it } from "vitest";
import { generateReference } from "./reference";

describe("generateReference", () => {
  it("returns 4 uppercase alphanumeric characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateReference()).toMatch(/^[A-Z0-9]{4}$/);
    }
  });
});

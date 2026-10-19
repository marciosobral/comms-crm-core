import { isCnpj, isCpf } from "@comms-crm-core/validation";
import { describe, expect, it } from "vitest";
import { fakeCnpj, fakeCpf } from "./documents";
import { SeededRandom } from "./random";

describe("fake documents", () => {
  it("generates CPFs and CNPJs with valid check digits", () => {
    const random = new SeededRandom(1);
    for (let i = 0; i < 200; i++) {
      expect(isCpf(fakeCpf(random))).toBe(true);
      expect(isCnpj(fakeCnpj(random))).toBe(true);
    }
  });
});

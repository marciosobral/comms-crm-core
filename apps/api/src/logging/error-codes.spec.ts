import { describe, expect, it } from "vitest";
import { ERROR_DEFINITIONS, ErrorCode } from "./error-codes";

describe("ERROR_DEFINITIONS", () => {
  it("gives every code a pt-BR message and an HTTP error status", () => {
    for (const code of Object.values(ErrorCode)) {
      const definition = ERROR_DEFINITIONS[code];
      expect(definition.message.trim().length).toBeGreaterThan(0);
      expect(definition.status).toBeGreaterThanOrEqual(400);
    }
  });
});

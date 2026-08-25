import { describe, expect, it } from "vitest";
import { buildIdentifierWhere } from "./identifier";

describe("buildIdentifierWhere", () => {
  it("matches by email when the identifier contains @", () => {
    expect(buildIdentifierWhere("admin@example.com")).toEqual({
      email: "admin@example.com",
    });
  });

  it("matches by cpf when the identifier has 11 digits, ignoring punctuation", () => {
    expect(buildIdentifierWhere("123.456.789-09")).toEqual({ cpf: "123.456.789-09" });
    expect(buildIdentifierWhere("12345678909")).toEqual({ cpf: "12345678909" });
  });

  it("falls back to reference for short codes", () => {
    expect(buildIdentifierWhere("AB12")).toEqual({ reference: "AB12" });
  });
});

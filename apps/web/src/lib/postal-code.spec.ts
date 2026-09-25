import { describe, expect, it } from "vitest";
import { addressFromPostalCode } from "./postal-code";

describe("addressFromPostalCode", () => {
  it("takes street, neighborhood, city and state from the lookup", () => {
    expect(
      addressFromPostalCode({
        postalCode: "71931360",
        street: "Rua 36",
        neighborhood: "Sul (Águas Claras)",
        city: "Brasília",
        state: "DF",
      }),
    ).toEqual({
      street: "Rua 36",
      neighborhood: "Sul (Águas Claras)",
      city: "Brasília",
      state: "DF",
    });
  });

  it("clears street and neighborhood for a city-wide CEP", () => {
    expect(
      addressFromPostalCode({
        postalCode: "78175000",
        street: null,
        neighborhood: null,
        city: "Poconé",
        state: "MT",
      }),
    ).toEqual({ street: "", neighborhood: "", city: "Poconé", state: "MT" });
  });
});

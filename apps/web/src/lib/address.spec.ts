import { describe, expect, it } from "vitest";
import {
  addressSummaryItems,
  defaultAddress,
  emptyAddressForm,
  formToAddressPayload,
  formatAddressCityUf,
  formatAddressLine,
  formatAddressOption,
  isAddressFormEmpty,
  uniqueAddressCities,
} from "./address";
import type { Address } from "./types";

const goiania: Address = {
  id: "a1",
  postalCode: "74015010",
  street: "Rua 90",
  number: "10",
  noNumber: false,
  complement: null,
  neighborhood: "Setor Sul",
  city: "Goiânia",
  state: "GO",
  isDefault: true,
};

describe("defaultAddress", () => {
  it("prefers the default flag", () => {
    const other = { ...goiania, id: "a2", isDefault: false, city: "Aparecida" };
    expect(defaultAddress([other, goiania])?.id).toBe("a1");
  });
});

describe("formatAddressLine", () => {
  it("joins street, neighborhood and city/UF", () => {
    expect(formatAddressLine(goiania)).toBe("Rua 90, 10 · Setor Sul · Goiânia/GO");
  });

  it("uses S/N when noNumber is set", () => {
    expect(formatAddressLine({ ...goiania, noNumber: true, number: null })).toBe(
      "Rua 90, S/N · Setor Sul · Goiânia/GO",
    );
  });
});

describe("formatAddressOption", () => {
  it("puts city/UF first and skips neighborhood", () => {
    expect(formatAddressOption(goiania)).toBe("Goiânia/GO — Rua 90, 10 (padrão)");
  });
});

describe("addressSummaryItems", () => {
  it("keeps filled fields and joins street with number", () => {
    expect(addressSummaryItems(goiania)).toEqual([
      { label: "CEP", value: "74015-010" },
      { label: "Endereço", value: "Rua 90, 10" },
      { label: "Bairro", value: "Setor Sul" },
      { label: "Cidade/UF", value: "Goiânia/GO" },
    ]);
  });

  it("omits blank parts", () => {
    expect(
      addressSummaryItems({
        ...goiania,
        postalCode: null,
        complement: null,
        neighborhood: null,
      }),
    ).toEqual([
      { label: "Endereço", value: "Rua 90, 10" },
      { label: "Cidade/UF", value: "Goiânia/GO" },
    ]);
  });
});

describe("formatAddressCityUf", () => {
  it("formats city and UF", () => {
    expect(formatAddressCityUf(goiania)).toBe("Goiânia/GO");
    expect(formatAddressCityUf(null)).toBe("-");
  });
});

describe("emptyAddressForm", () => {
  it("starts blank", () => {
    expect(emptyAddressForm().street).toBe("");
    expect(emptyAddressForm(true).isDefault).toBe(true);
  });
});

describe("formToAddressPayload", () => {
  it("keeps CEP digits and drops number when S/N", () => {
    expect(
      formToAddressPayload({
        ...emptyAddressForm(true),
        postalCode: "74015-010",
        street: "Rua 90",
        number: "10",
        noNumber: true,
        city: "Goiânia",
        state: "go",
      }),
    ).toEqual({
      postalCode: "74015010",
      street: "Rua 90",
      number: undefined,
      noNumber: true,
      complement: undefined,
      neighborhood: undefined,
      city: "Goiânia",
      state: "GO",
      isDefault: true,
    });
  });
});

describe("isAddressFormEmpty", () => {
  it("treats a blank form as empty", () => {
    expect(isAddressFormEmpty(emptyAddressForm())).toBe(true);
    expect(isAddressFormEmpty({ ...emptyAddressForm(), city: "Goiânia" })).toBe(false);
  });
});

describe("uniqueAddressCities", () => {
  it("collects distinct cities", () => {
    expect(
      uniqueAddressCities([
        { addresses: [goiania, { ...goiania, id: "a2", city: "Aparecida", isDefault: false }] },
        { addresses: [{ ...goiania, id: "a3", city: "Goiânia" }] },
      ]),
    ).toEqual(["Aparecida", "Goiânia"]);
  });
});

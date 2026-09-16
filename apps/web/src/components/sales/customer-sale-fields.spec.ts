import { describe, expect, it } from "vitest";
import type { Customer } from "../../lib/types";
import {
  customerSearchHint,
  customerToSaleFields,
  emptyCustomerSaleFields,
  isCustomerSearchQuery,
} from "./customer-sale-fields";

const customer: Customer = {
  id: "c1",
  name: "Fulana de Tal",
  cpfCnpj: "12345678909",
  birthDate: "1990-02-13T00:00:00.000Z",
  motherName: "Beltrana",
  address: "Rua A, 10",
  city: "Goiânia",
  state: "GO",
  email: "fulana@example.com",
  phone1: "62988881234",
  phone2: null,
};

describe("isCustomerSearchQuery", () => {
  it("requires two non-space characters", () => {
    expect(isCustomerSearchQuery("a")).toBe(false);
    expect(isCustomerSearchQuery("  an")).toBe(true);
  });
});

describe("customerToSaleFields", () => {
  it("maps a customer into masked sale form fields", () => {
    expect(customerToSaleFields(customer)).toEqual({
      customerName: "Fulana de Tal",
      customerCpfCnpj: "123.456.789-09",
      customerBirthDate: "1990-02-13",
      customerMotherName: "Beltrana",
      customerAddress: "Rua A, 10",
      customerCity: "Goiânia",
      customerState: "GO",
      customerEmail: "fulana@example.com",
      customerPhone1: "(62) 98888-1234",
      customerPhone2: "",
    });
  });
});

describe("customerSearchHint", () => {
  it("shows document and phone", () => {
    expect(customerSearchHint(customer)).toBe("123.456.789-09 · (62) 98888-1234");
  });

  it("falls back to email when there is no phone", () => {
    expect(customerSearchHint({ ...customer, phone1: null })).toBe(
      "123.456.789-09 · fulana@example.com",
    );
  });
});

describe("emptyCustomerSaleFields", () => {
  it("clears every customer field", () => {
    expect(emptyCustomerSaleFields().customerName).toBe("");
    expect(emptyCustomerSaleFields().customerCpfCnpj).toBe("");
  });
});

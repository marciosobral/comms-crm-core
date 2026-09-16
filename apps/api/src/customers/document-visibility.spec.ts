import { describe, expect, it } from "vitest";
import {
  canViewCustomerDocument,
  withVisibleCustomerDocument,
  withVisibleSaleDocument,
} from "./document-visibility";

const viewer = {
  isSuperAdmin: false,
  status: "ACTIVE",
  role: { permissions: ["customers.view"] },
};
const docViewer = {
  isSuperAdmin: false,
  status: "ACTIVE",
  role: { permissions: ["customers.view", "customers.view_document"] },
};
const superadmin = { isSuperAdmin: true, status: "ACTIVE", role: null };

describe("canViewCustomerDocument", () => {
  it("allows superadmin and the dedicated permission", () => {
    expect(canViewCustomerDocument(superadmin)).toBe(true);
    expect(canViewCustomerDocument(docViewer)).toBe(true);
    expect(canViewCustomerDocument(viewer)).toBe(false);
  });
});

describe("withVisibleCustomerDocument", () => {
  it("masks CPF when the actor cannot view documents", () => {
    expect(withVisibleCustomerDocument({ id: "c1", cpfCnpj: "12345678909" }, viewer)).toEqual({
      id: "c1",
      cpfCnpj: "123.xxx.x89-09",
    });
  });

  it("keeps the stored digits when the actor can view documents", () => {
    expect(
      withVisibleCustomerDocument({ id: "c1", cpfCnpj: "12345678909" }, docViewer).cpfCnpj,
    ).toBe("12345678909");
  });
});

describe("withVisibleSaleDocument", () => {
  it("masks the nested customer document", () => {
    const sale = { id: "s1", customer: { name: "Fulana", cpfCnpj: "12345678909" } };
    expect(withVisibleSaleDocument(sale, viewer).customer.cpfCnpj).toBe("123.xxx.x89-09");
  });
});

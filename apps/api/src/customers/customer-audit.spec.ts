import { describe, expect, it } from "vitest";
import { addressLine, customerAuditSnapshot } from "./customer-audit";

const address = {
  street: "Rua 36",
  number: null,
  noNumber: true,
  complement: "QD 32 LT 17",
  neighborhood: "Setor Sul",
  city: "Goiânia",
  state: "GO",
  postalCode: "74015010",
};

describe("addressLine", () => {
  it("reads like an address instead of stored columns", () => {
    expect(addressLine(address)).toBe(
      "Rua 36, S/N - QD 32 LT 17 - Setor Sul - Goiânia/GO - CEP 74015-010",
    );
  });
});

describe("customerAuditSnapshot", () => {
  it("records addresses as text so ids and timestamps never show up as changes", () => {
    const snapshot = customerAuditSnapshot({
      name: "Fulano de Tal",
      cpfCnpj: "12345678909",
      birthDate: new Date("1990-01-01T00:00:00Z"),
      motherName: null,
      email: null,
      phone1: null,
      phone2: null,
      addresses: [address],
    });
    expect(snapshot.birthDate).toBe("1990-01-01");
    expect(snapshot.addresses).toBe(addressLine(address));
  });
});

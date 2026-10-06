import { AppException } from "@/logging/app-exception";
import { describe, expect, it } from "vitest";
import { resolveDirectDebit, resolveNextBankData } from "./direct-debit";

const complete = {
  bankCode: "001",
  bankAgency: "3041",
  bankAgencyDigit: "2",
  bankAccount: "18774",
  bankAccountDigit: "X",
  bankAccountType: "CHECKING" as const,
  accountHolderIsCustomer: true,
};

describe("resolveDirectDebit", () => {
  it("returns the bank name from the official list", () => {
    expect(resolveDirectDebit(complete).bankName).toBe("BCO DO BRASIL S.A.");
  });

  it("rejects an unknown bank code", () => {
    expect(() => resolveDirectDebit({ ...complete, bankCode: "9999" })).toThrow(AppException);
  });

  it.each([
    "bankCode",
    "bankAgency",
    "bankAccount",
    "bankAccountDigit",
    "bankAccountType",
    "accountHolderIsCustomer",
  ] as const)("requires %s", (field) => {
    expect(() => resolveDirectDebit({ ...complete, [field]: null })).toThrow(AppException);
  });

  it("accepts a missing agency digit", () => {
    expect(() => resolveDirectDebit({ ...complete, bankAgencyDigit: null })).not.toThrow();
  });

  it("requires holder name and a valid CPF when the holder is not the customer", () => {
    const other = { ...complete, accountHolderIsCustomer: false };
    expect(() => resolveDirectDebit(other)).toThrow(AppException);
    expect(() =>
      resolveDirectDebit({
        ...other,
        accountHolderName: "Beltrana",
        accountHolderCpf: "11111111111",
      }),
    ).toThrow(AppException);
    expect(() =>
      resolveDirectDebit({
        ...other,
        accountHolderName: "Beltrana",
        accountHolderCpf: "12345678909",
      }),
    ).not.toThrow();
  });

  it("drops holder name and CPF when the holder is the customer", () => {
    const result = resolveDirectDebit({
      ...complete,
      accountHolderName: "Beltrana",
      accountHolderCpf: "12345678909",
    });
    expect(result.accountHolderName).toBeNull();
    expect(result.accountHolderCpf).toBeNull();
  });
});

describe("resolveNextBankData", () => {
  it("prefers the dto value and falls back to the stored one", () => {
    const next = resolveNextBankData(
      { bankCode: "237", accountHolderIsCustomer: false },
      {
        bankCode: "001",
        bankAgency: "1234",
        accountHolderIsCustomer: true,
        accountHolderName: null,
      },
    );
    expect(next.bankCode).toBe("237");
    expect(next.bankAgency).toBe("1234");
    expect(next.accountHolderIsCustomer).toBe(false);
    expect(next.accountHolderName).toBeNull();
  });
});

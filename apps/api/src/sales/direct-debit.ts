import { findBank, isCpf } from "@comms-core/validation";
import type { BankAccountType } from "../../prisma/generated/prisma/client/client";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";

export interface DirectDebitInput {
  bankCode?: string | null;
  bankAgency?: string | null;
  bankAgencyDigit?: string | null;
  bankAccount?: string | null;
  bankAccountDigit?: string | null;
  bankAccountType?: BankAccountType | null;
  accountHolderIsCustomer?: boolean | null;
  accountHolderName?: string | null;
  accountHolderCpf?: string | null;
}

export interface DirectDebitData {
  bankCode: string;
  bankName: string;
  bankAgency: string;
  bankAgencyDigit: string | null;
  bankAccount: string;
  bankAccountDigit: string;
  bankAccountType: BankAccountType;
  accountHolderIsCustomer: boolean;
  accountHolderName: string | null;
  accountHolderCpf: string | null;
}

export const EMPTY_BANK_DATA = {
  bankCode: null,
  bankName: null,
  bankAgency: null,
  bankAgencyDigit: null,
  bankAccount: null,
  bankAccountDigit: null,
  bankAccountType: null,
  accountHolderIsCustomer: null,
  accountHolderName: null,
  accountHolderCpf: null,
} as const;

export function isDirectDebit(paymentValue: string): boolean {
  return paymentValue.toUpperCase().includes("DÉBITO");
}

function missing(message: string): AppException {
  return new AppException(ErrorCode.SALE_BANK_DATA_REQUIRED, message);
}

/** Validates the bank data a direct debit needs and resolves the bank name from the official list. */
export function resolveDirectDebit(input: DirectDebitInput): DirectDebitData {
  const {
    bankCode,
    bankAgency,
    bankAccount,
    bankAccountDigit,
    bankAccountType,
    accountHolderIsCustomer,
  } = input;
  if (
    !bankCode ||
    !bankAgency ||
    !bankAccount ||
    !bankAccountDigit ||
    !bankAccountType ||
    accountHolderIsCustomer === null ||
    accountHolderIsCustomer === undefined
  ) {
    throw missing("Dados bancários incompletos para débito automático");
  }
  const bank = findBank(bankCode);
  if (!bank) throw missing("Banco inválido");

  let accountHolderName: string | null = null;
  let accountHolderCpf: string | null = null;
  if (!accountHolderIsCustomer) {
    accountHolderName = input.accountHolderName?.trim() || null;
    accountHolderCpf = input.accountHolderCpf || null;
    if (!accountHolderName) throw missing("Informe o nome do titular da conta");
    if (!accountHolderCpf || !isCpf(accountHolderCpf)) {
      throw missing("CPF do titular da conta inválido");
    }
  }

  return {
    bankCode,
    bankName: bank.name,
    bankAgency,
    bankAgencyDigit: input.bankAgencyDigit || null,
    bankAccount,
    bankAccountDigit: bankAccountDigit.toUpperCase(),
    bankAccountType,
    accountHolderIsCustomer,
    accountHolderName,
    accountHolderCpf,
  };
}

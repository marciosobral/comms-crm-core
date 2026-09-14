import { applyCnpjMask, formatCnpj, isCnpj } from "./cnpj.js";
import { allSameDigits, digitsOnly, mod11Check } from "./digits.js";

const CPF_FACTORS_1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_FACTORS_2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export function isCpf(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 11 || allSameDigits(digits)) return false;
  const d1 = mod11Check(digits.slice(0, 9), CPF_FACTORS_1);
  const d2 = mod11Check(digits.slice(0, 10), CPF_FACTORS_2);
  return digits[9] === String(d1) && digits[10] === String(d2);
}

export function applyCpfMask(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 11);
  let result = digits.slice(0, 3);
  if (digits.length > 3) result += `.${digits.slice(3, 6)}`;
  if (digits.length > 6) result += `.${digits.slice(6, 9)}`;
  if (digits.length > 9) result += `-${digits.slice(9, 11)}`;
  return result;
}

export function formatCpf(value: string): string {
  return applyCpfMask(digitsOnly(value));
}

export function isCpfCnpj(value: string): boolean {
  const digits = digitsOnly(value);
  return isCpf(digits) || isCnpj(digits);
}

export function applyCpfCnpjMask(raw: string): string {
  const digits = digitsOnly(raw);
  if (digits.length <= 11) return applyCpfMask(raw);
  return applyCnpjMask(raw);
}

export function formatCpfCnpj(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length <= 11) return formatCpf(digits);
  return formatCnpj(digits);
}

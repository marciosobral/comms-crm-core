import { allSameDigits, digitsOnly, mod11Check } from "./digits.js";

const CNPJ_FACTORS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_FACTORS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function isCnpj(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 14 || allSameDigits(digits)) return false;
  const d1 = mod11Check(digits.slice(0, 12), CNPJ_FACTORS_1);
  const d2 = mod11Check(digits.slice(0, 13), CNPJ_FACTORS_2);
  return digits[12] === String(d1) && digits[13] === String(d2);
}

export function applyCnpjMask(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 14);
  let result = digits.slice(0, 2);
  if (digits.length > 2) result += `.${digits.slice(2, 5)}`;
  if (digits.length > 5) result += `.${digits.slice(5, 8)}`;
  if (digits.length > 8) result += `/${digits.slice(8, 12)}`;
  if (digits.length > 12) result += `-${digits.slice(12, 14)}`;
  return result;
}

export function formatCnpj(value: string): string {
  return applyCnpjMask(digitsOnly(value));
}

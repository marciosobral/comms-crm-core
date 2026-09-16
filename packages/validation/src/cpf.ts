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

function maskDocumentDigits(digits: string): string {
  if (digits.length <= 4) return "x".repeat(digits.length);
  if (digits.length <= 7) return `${"x".repeat(digits.length - 4)}${digits.slice(-4)}`;
  return `${digits.slice(0, 3)}${"x".repeat(digits.length - 7)}${digits.slice(-4)}`;
}

function formatCpfChars(chars: string): string {
  let result = chars.slice(0, 3);
  if (chars.length > 3) result += `.${chars.slice(3, 6)}`;
  if (chars.length > 6) result += `.${chars.slice(6, 9)}`;
  if (chars.length > 9) result += `-${chars.slice(9, 11)}`;
  return result;
}

function formatCnpjChars(chars: string): string {
  let result = chars.slice(0, 2);
  if (chars.length > 2) result += `.${chars.slice(2, 5)}`;
  if (chars.length > 5) result += `.${chars.slice(5, 8)}`;
  if (chars.length > 8) result += `/${chars.slice(8, 12)}`;
  if (chars.length > 12) result += `-${chars.slice(12, 14)}`;
  return result;
}

export function maskCpfCnpj(value: string): string {
  const digits = digitsOnly(value);
  if (!digits) return "";
  const masked = maskDocumentDigits(digits);
  return digits.length <= 11 ? formatCpfChars(masked) : formatCnpjChars(masked);
}

export function isMaskedCpfCnpj(value: string): boolean {
  return /x/i.test(value);
}

export function formatDisplayCpfCnpj(value: string): string {
  if (!value || isMaskedCpfCnpj(value)) return value;
  return formatCpfCnpj(value);
}

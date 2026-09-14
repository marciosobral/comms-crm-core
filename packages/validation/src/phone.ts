import { digitsOnly } from "./digits.js";

export function isPhone(value: string): boolean {
  return /^\d{10,11}$/.test(digitsOnly(value));
}

export function applyPhoneMask(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 11);
  if (digits.length === 0) return "";
  let result = `(${digits.slice(0, 2)}`;
  if (digits.length >= 2) result += ")";
  if (digits.length > 2) {
    if (digits.length > 10) {
      result += ` ${digits.slice(2, 7)}`;
      if (digits.length > 7) result += `-${digits.slice(7, 11)}`;
    } else {
      result += ` ${digits.slice(2, 6)}`;
      if (digits.length > 6) result += `-${digits.slice(6, 10)}`;
    }
  }
  return result;
}

export function formatPhone(value: string): string {
  return applyPhoneMask(digitsOnly(value));
}

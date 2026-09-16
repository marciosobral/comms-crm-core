import { digitsOnly } from "./digits.js";

export function isCep(value: string): boolean {
  return /^\d{8}$/.test(digitsOnly(value));
}

export function applyCepMask(raw: string): string {
  const digits = digitsOnly(raw).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCep(value: string): string {
  return applyCepMask(digitsOnly(value));
}

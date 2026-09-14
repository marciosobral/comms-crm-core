import { Transform } from "class-transformer";
import { digitsOnly, normalizeEmail, normalizeUf } from "@comms-core/validation";

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

export const ToDigits = () =>
  Transform(({ value }: { value: unknown }) => {
    const raw = asString(value);
    if (raw === undefined) return value;
    const digits = digitsOnly(raw);
    return digits === "" ? undefined : digits;
  });

export const ToEmail = () =>
  Transform(({ value }: { value: unknown }) => {
    const raw = asString(value);
    if (raw === undefined) return value;
    const email = normalizeEmail(raw);
    return email === "" ? undefined : email;
  });

export const ToUf = () =>
  Transform(({ value }: { value: unknown }) => {
    const raw = asString(value);
    if (raw === undefined) return value;
    const uf = normalizeUf(raw);
    return uf === "" ? undefined : uf;
  });

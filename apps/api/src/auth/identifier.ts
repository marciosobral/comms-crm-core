import { digitsOnly } from "@comms-crm-core/validation";
import { normalizeReference } from "../users/reference";

export type IdentifierWhere = { email: string } | { cpf: string } | { reference: string };

export function buildIdentifierWhere(identifier: string): IdentifierWhere {
  if (identifier.includes("@")) return { email: identifier.trim().toLowerCase() };
  const digits = digitsOnly(identifier);
  if (digits.length === 11) return { cpf: digits };
  return { reference: normalizeReference(identifier) };
}

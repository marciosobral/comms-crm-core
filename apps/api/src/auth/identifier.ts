import { normalizeReference } from "../users/reference";

export type IdentifierWhere = { email: string } | { cpf: string } | { reference: string };

export function buildIdentifierWhere(identifier: string): IdentifierWhere {
  if (identifier.includes("@")) return { email: identifier };
  const digits = identifier.replace(/\D/g, "");
  if (digits.length === 11) return { cpf: identifier };
  return { reference: normalizeReference(identifier) };
}

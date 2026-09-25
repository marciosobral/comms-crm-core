import { findBank, formatDisplayCpfCnpj, formatPhone } from "@comms-crm-core/validation";
import { z } from "zod";
import { formatAddressLine } from "./address";
import { formatBRL, formatDate } from "./format";
import type { SaleHistoryEntry } from "./types";

export const ACTION_LABELS: Record<SaleHistoryEntry["action"], string> = {
  CREATE: "Criação",
  UPDATE: "Alteração",
  DELETE: "Remoção",
};

const FIELD_LABELS: Record<string, string> = {
  statusId: "Status",
  sellerId: "Vendedor",
  supervisorId: "Supervisor",
  bkoId: "BKO",
  auditorId: "Auditor",
  canceledById: "Cancelada por",
  planId: "Plano",
  amount: "Valor",
  dueDay: "Vencimento",
  date: "Data da venda",
  paymentMethodId: "Forma de pagamento",
  systemId: "Sistema",
  pdvId: "PDV",
  mailingId: "Mailing",
  orderNumber: "Ordem de venda",
  notes: "Observações",
  scheduleDate: "Data do agendamento",
  schedulePeriodId: "Período",
  installedAt: "Data da instalação",
  auditNote: "Auditoria",
  brscan: "BRScan",
  cancelReason: "Motivo do cancelamento",
  bankCode: "Banco",
  bankAgency: "Agência",
  bankAgencyDigit: "Dígito da agência",
  bankAccount: "Conta",
  bankAccountDigit: "Dígito da conta",
  bankAccountType: "Tipo de conta",
  accountHolderIsCustomer: "Titular é o cliente",
  accountHolderName: "Nome do titular",
  accountHolderCpf: "CPF do titular",
  name: "Nome / Razão social",
  cpfCnpj: "CPF/CNPJ",
  birthDate: "Data de nascimento",
  motherName: "Nome da mãe",
  email: "E-mail",
  phone1: "Contato 1",
  phone2: "Contato 2",
  addresses: "Endereços",
};

const DATE_FIELDS = new Set(["date", "scheduleDate", "installedAt", "birthDate"]);
const PHONE_FIELDS = new Set(["phone1", "phone2"]);
const DOCUMENT_FIELDS = new Set(["cpfCnpj", "accountHolderCpf"]);
const ACCOUNT_TYPE_LABELS: Record<string, string> = { CHECKING: "Corrente", SAVINGS: "Poupança" };

const optionalText = z
  .string()
  .nullish()
  .transform((value) => value || null);

const legacyAddresses = z.array(
  z.object({
    street: optionalText,
    number: optionalText,
    noNumber: z.boolean().nullish().transform(Boolean),
    complement: optionalText,
    neighborhood: optionalText,
    city: optionalText,
    state: optionalText,
    postalCode: optionalText,
  }),
);

function legacyAddressList(value: string): string | null {
  try {
    const parsed = legacyAddresses.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data.map(formatAddressLine).join(" | ") : null;
  } catch {
    return null;
  }
}

export function formatHistoryValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") {
    if (field === "brscan") return value ? "Aprovado" : "Não";
    return value ? "Sim" : "Não";
  }
  const text = String(value);
  if (field === "amount") return formatBRL(text);
  if (field === "dueDay") return `Dia ${text}`;
  if (DATE_FIELDS.has(field)) return formatDate(text);
  if (PHONE_FIELDS.has(field)) return formatPhone(text);
  if (DOCUMENT_FIELDS.has(field)) return formatDisplayCpfCnpj(text);
  if (field === "bankAccountType") return ACCOUNT_TYPE_LABELS[text] ?? text;
  if (field === "bankCode") {
    const bank = findBank(text);
    return bank ? `${bank.code} - ${bank.name}` : text;
  }
  if (field === "addresses" && text.startsWith("[")) return legacyAddressList(text) ?? "-";
  return text;
}

export interface HistoryChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

export function historyChanges(diff: SaleHistoryEntry["diff"]): HistoryChange[] {
  if (!diff) return [];
  return Object.entries(diff).flatMap(([field, change]) => {
    const label = FIELD_LABELS[field];
    if (!label) return [];
    return [
      {
        field,
        label,
        from: formatHistoryValue(field, change.from),
        to: formatHistoryValue(field, change.to),
      },
    ];
  });
}

export function fieldLabels(fields: string[]): string[] {
  return fields.flatMap((field) => (FIELD_LABELS[field] ? [FIELD_LABELS[field]] : []));
}

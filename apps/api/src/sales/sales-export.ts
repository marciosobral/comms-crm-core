import { UTF8_BOM, csvLine } from "@/common/csv";
import { EXPECTED_HEADER } from "@/imports/parser";
import {
  dateOnlyKey,
  formatCpfCnpj,
  formatPhone,
  isPhone,
  maskCpfCnpj,
} from "@comms-crm-core/validation";

export interface SaleExportRow {
  orderNumber: string | null;
  dueDay: number | null;
  amount: { toString(): string };
  qty: number;
  date: Date;
  notes: string | null;
  auditNote: string | null;
  scheduleDate: Date | null;
  installedAt: Date | null;
  brscan: boolean | null;
  pdv: { value: string } | null;
  system: { value: string } | null;
  status: { value: string };
  mailing: { value: string } | null;
  paymentMethod: { value: string } | null;
  schedulePeriod: { value: string } | null;
  seller: { name: string; externalReference: string | null };
  supervisor: { name: string } | null;
  bko: { name: string } | null;
  auditor: { name: string } | null;
  plan: { name: string; type: { value: string } } | null;
  address: { city: string | null; state: string | null } | null;
  customer: {
    name: string;
    cpfCnpj: string;
    phone1: string | null;
    phone2: string | null;
    email: string | null;
  };
}

const moneyFormat = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(date: Date): string {
  const [year, month, day] = dateOnlyKey(date).split("-");
  return `${day}/${month}/${year}`;
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function formatContact(value: string | null): string {
  if (!value) return "";
  return isPhone(value) ? formatPhone(value) : value;
}

function formatSchedule(row: SaleExportRow): string {
  if (!row.scheduleDate) return "";
  const day = formatDate(row.scheduleDate);
  return row.schedulePeriod ? `${day} ${row.schedulePeriod.value}` : day;
}

function formatBrscan(value: boolean | null): string {
  if (value === null) return "";
  return value ? "SIM" : "NÃO";
}

function saleCells(row: SaleExportRow, canViewDocument: boolean): string[] {
  const isFixedPlan = row.plan !== null && normalizeText(row.plan.type.value) === "fixo";
  const planName = row.plan?.name ?? "";
  const cells: Record<(typeof EXPECTED_HEADER)[number], string> = {
    PDV: row.pdv?.value ?? "",
    LOGIN: row.seller.externalReference ?? "",
    BKO: row.bko?.name ?? "",
    SISTEMA: row.system?.value ?? "",
    AUDITOR: row.auditor?.name ?? "",
    "ORDEM DE VENDA": row.orderNumber ?? "",
    STATUS: row.status.value,
    MAILING: row.mailing?.value ?? "",
    VENDEDOR: row.seller.name,
    SUPERVISOR: row.supervisor?.name ?? "",
    "PLANO FIXO": isFixedPlan ? planName : "",
    "PLANO INTERNET": isFixedPlan ? "" : planName,
    VENCIMENTO: row.dueDay === null ? "" : String(row.dueDay),
    VALOR: moneyFormat.format(Number(row.amount.toString())),
    QTD: String(row.qty),
    UF: row.address?.state ?? "",
    CIDADE: row.address?.city ?? "",
    "CPF/CNPJ": canViewDocument
      ? formatCpfCnpj(row.customer.cpfCnpj)
      : maskCpfCnpj(row.customer.cpfCnpj),
    DATA: formatDate(row.date),
    "NOME / RAZÃO SOCIAL": row.customer.name,
    OBS: row.notes ?? "",
    "CONTATO 1": formatContact(row.customer.phone1),
    "CONTATO 2": formatContact(row.customer.phone2),
    "E-MAIL": row.customer.email ?? "",
    "FORMA DE PAG": row.paymentMethod?.value ?? "",
    AUDITORIA: row.auditNote ?? "",
    AGENDAMENTO: formatSchedule(row),
    INSTALAÇÃO: row.installedAt ? formatDate(row.installedAt) : "",
    BRScan: formatBrscan(row.brscan),
  };
  return EXPECTED_HEADER.map((name) => cells[name]);
}

export function salesToImportCsv(
  rows: SaleExportRow[],
  options: { canViewDocument: boolean },
): string {
  const lines = [
    csvLine(EXPECTED_HEADER),
    ...rows.map((row) => csvLine(saleCells(row, options.canViewDocument))),
  ];
  return `${UTF8_BOM}${lines.join("\n")}\n`;
}

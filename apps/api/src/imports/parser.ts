import { createHash } from "node:crypto";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";

const EXPECTED_HEADER = [
  "PDV",
  "LOGIN",
  "BKO",
  "SISTEMA",
  "AUDITOR",
  "ORDEM DE VENDA",
  "STATUS",
  "MAILING",
  "VENDEDOR",
  "SUPERVISOR",
  "PLANO FIXO",
  "PLANO INTERNET",
  "VENCIMENTO",
  "VALOR",
  "QTD",
  "UF",
  "CIDADE",
  "CPF/CNPJ",
  "DATA",
  "NOME / RAZÃO SOCIAL",
  "OBS",
  "CONTATO 1",
  "CONTATO 2",
  "E-MAIL",
  "FORMA DE PAG",
  "AUDITORIA",
  "AGENDAMENTO",
  "INSTALAÇÃO",
  "BRScan",
];

const MONTHS: Record<string, string> = {
  jan: "01",
  fev: "02",
  mar: "03",
  abr: "04",
  mai: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  set: "09",
  out: "10",
  nov: "11",
  dez: "12",
};

export interface RawSaleRecord {
  pdv: string | null;
  bko: string | null;
  system: string | null;
  auditor: string | null;
  orderNumber: string | null;
  status: string | null;
  mailing: string | null;
  seller: string | null;
  supervisor: string | null;
  fixedPlan: string | null;
  internetPlan: string | null;
  dueDay: number | null;
  amount: number | null;
  qty: number;
  state: string | null;
  city: string | null;
  cpfCnpj: string | null;
  date: string | null;
  customerName: string | null;
  notes: string | null;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  paymentMethod: string | null;
  auditNote: string | null;
  scheduleDate: string | null;
  schedulePeriod: string | null;
  installedAt: string | null;
  brscan: boolean | null;
}

export function decodeSpreadsheet(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("latin1").decode(buffer);
  }
}

function cleanCell(cell: string): string {
  return cell.replace(/^[\s ﻿]+|[\s ﻿]+$/g, "");
}

export function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(";").map((cell) => cleanCell(cell)))
    .filter((cells) => cells.some((cell) => cell !== ""));
}

export function assertHeader(cells: string[]): void {
  const named = cells.slice(0, EXPECTED_HEADER.length);
  const matches =
    named.length === EXPECTED_HEADER.length &&
    named.every((cell, index) => cell.toUpperCase() === EXPECTED_HEADER[index].toUpperCase());
  if (!matches) {
    throw new AppException(
      ErrorCode.IMPORT_HEADER_INVALID,
      "Cabeçalho da planilha não reconhecido",
    );
  }
}

function blankToNull(cell: string | undefined): string | null {
  const value = (cell ?? "").trim();
  if (value === "" || value === "-") return null;
  return value;
}

export function parseBRL(text: string): number | null {
  const raw = blankToNull(text);
  if (!raw) return null;
  const parsed = Number(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePtDate(text: string, year: number): string | null {
  const raw = blankToNull(text);
  if (!raw) return null;
  const full = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (full) return `${full[3]}-${full[2]}-${full[1]}`;
  const short = raw.toLowerCase().match(/^(\d{2})\/([a-zç]{3})$/);
  if (short && MONTHS[short[2]]) return `${year}-${MONTHS[short[2]]}-${short[1]}`;
  return null;
}

export function parseSchedule(text: string): { start: string | null; end: string | null } {
  const raw = blankToNull(text);
  if (!raw) return { start: null, end: null };
  const match = raw.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?:\s*-\s*(\d{2}):(\d{2}))?)?/,
  );
  if (!match) return { start: null, end: null };
  const [, day, month, yearPart, startHour, startMinute, endHour, endMinute] = match;
  const dateIso = `${yearPart}-${month}-${day}`;
  const start = `${dateIso}T${startHour ?? "00"}:${startMinute ?? "00"}:00`;
  const end = endHour ? `${dateIso}T${endHour}:${endMinute}:00` : null;
  return { start, end };
}

export function parseSchedulePeriod(text: string): {
  date: string | null;
  period: string | null;
} {
  const raw = blankToNull(text);
  if (!raw) return { date: null, period: null };
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}))?/);
  if (!match) return { date: null, period: null };
  const [, day, month, year, start, end] = match;
  return { date: `${year}-${month}-${day}`, period: start && end ? `${start} - ${end}` : null };
}

function parseBrscan(text: string): boolean | null {
  const raw = blankToNull(text)?.toUpperCase();
  if (raw === "SIM") return true;
  if (raw === "NÃO" || raw === "NAO") return false;
  return null;
}

function parseIntOrNull(text: string): number | null {
  const raw = blankToNull(text);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeRow(cells: string[], year: number): RawSaleRecord {
  const schedule = parseSchedulePeriod(cells[26] ?? "");
  const installed = parseSchedule(cells[27] ?? "");
  return {
    pdv: blankToNull(cells[0]),
    bko: blankToNull(cells[2]),
    system: blankToNull(cells[3]),
    auditor: blankToNull(cells[4]),
    orderNumber: blankToNull(cells[5]),
    status: blankToNull(cells[6]),
    mailing: blankToNull(cells[7]),
    seller: blankToNull(cells[8]),
    supervisor: blankToNull(cells[9]),
    fixedPlan: blankToNull(cells[10]),
    internetPlan: blankToNull(cells[11]),
    dueDay: parseIntOrNull(cells[12] ?? ""),
    amount: parseBRL(cells[13] ?? ""),
    // An empty QTD cell means one unit.
    qty: parseIntOrNull(cells[14] ?? "") ?? 1,
    state: blankToNull(cells[15]),
    city: blankToNull(cells[16]),
    cpfCnpj: blankToNull(cells[17]),
    date: parsePtDate(cells[18] ?? "", year),
    customerName: blankToNull(cells[19]),
    notes: blankToNull(cells[20]),
    phone1: blankToNull(cells[21]),
    phone2: blankToNull(cells[22]),
    email: blankToNull(cells[23]),
    paymentMethod: blankToNull(cells[24]),
    auditNote: blankToNull(cells[25]),
    scheduleDate: schedule.date,
    schedulePeriod: schedule.period,
    installedAt: installed.start,
    brscan: parseBrscan(cells[28] ?? ""),
  };
}

export function rowHash(cells: string[]): string {
  return createHash("sha256").update(cells.join(";")).digest("hex");
}

export function dedupeKey(record: RawSaleRecord): string {
  return `${record.orderNumber ?? ""}|${record.cpfCnpj ?? ""}|${record.date ?? ""}`;
}

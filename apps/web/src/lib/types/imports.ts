import type { DomainType } from "./domain-values";
import type { UserRef } from "./shared";

export interface ImportBatchStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  pending: number;
  ignored?: number;
}

export interface ImportBatchRow {
  id: string;
  fileName: string;
  createdAt: string;
  stats: ImportBatchStats | null;
  importedBy: UserRef;
}

export type ImportRowStatus = "CREATED" | "UPDATED" | "SKIPPED" | "PENDING";

export interface ImportRowItem {
  id: string;
  status: ImportRowStatus;
  message: string | null;
  raw: string[];
  saleId: string | null;
  lineNumber: number | null;
}

export type ImportBatchDetail = ImportBatchRow;

export interface ImportRowsPage {
  items: ImportRowItem[];
  total: number;
  page: number;
  perPage: number;
}

export type ImportUnresolvedDomainType = Extract<
  DomainType,
  "SALE_STATUS" | "PAYMENT_METHOD" | "MAILING" | "SCHEDULE_PERIOD"
>;

export interface ImportUnresolvedValue {
  kind: ImportMappingKind;
  domainType: ImportUnresolvedDomainType | null;
  sourceValue: string;
  fields: string[];
  rows: number;
  blocking: boolean;
}

export interface ImportOption {
  id: string;
  value: string;
}

export interface ImportUnresolved {
  values: ImportUnresolvedValue[];
  options: {
    users: { id: string; name: string }[];
    plans: { id: string; name: string }[];
    domainValues: Record<ImportUnresolvedDomainType, ImportOption[]>;
  };
}

export interface ImportUploadResult {
  id: string;
  fileName: string;
  stats: ImportBatchStats;
  createdAt: string;
}

export type ImportMappingKind = "USER" | "DOMAIN" | "PLAN";

export interface ImportMappingRow {
  id: string;
  kind: ImportMappingKind;
  domainType: DomainType | null;
  sourceValue: string;
  targetId: string;
  targetLabel: string | null;
}

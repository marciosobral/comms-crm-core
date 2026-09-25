import type { DomainType } from "./domain-values";
import type { UserRef } from "./shared";

export interface ImportBatchRow {
  id: string;
  fileName: string;
  createdAt: string;
  stats: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    pending: number;
  } | null;
  importedBy: UserRef;
}

export type ImportRowStatus = "CREATED" | "UPDATED" | "SKIPPED" | "PENDING";

export interface ImportRowItem {
  id: string;
  status: ImportRowStatus;
  message: string | null;
  raw: string[];
  saleId: string | null;
}

export type ImportBatchDetail = ImportBatchRow & { rows: ImportRowItem[] };

export type ImportMappingKind = "USER" | "DOMAIN" | "PLAN";

export interface ImportMappingRow {
  id: string;
  kind: ImportMappingKind;
  domainType: DomainType | null;
  sourceValue: string;
  targetId: string;
  targetLabel: string | null;
}

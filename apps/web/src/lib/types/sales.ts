import type { Customer, CustomerInput } from "./customers";
import type { PlanRef } from "./plans";
import type { DomainRef, UserRef } from "./shared";

export interface SaleAddress {
  id: string;
  postalCode: string | null;
  street: string | null;
  number: string | null;
  noNumber: boolean;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

export interface SaleRow {
  id: string;
  orderNumber: string | null;
  login: string | null;
  qty: number;
  amount: string;
  dueDay: number | null;
  date: string;
  notes: string | null;
  auditNote: string | null;
  scheduleDate: string | null;
  installedAt: string | null;
  brscan: boolean | null;
  bankCode: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAgencyDigit: string | null;
  bankAccount: string | null;
  bankAccountDigit: string | null;
  bankAccountType: BankAccountType | null;
  accountHolderIsCustomer: boolean | null;
  accountHolderName: string | null;
  accountHolderCpf: string | null;
  cancelReason: string | null;
  canceledAt: string | null;
  customer: Customer;
  address: SaleAddress | null;
  status: DomainRef;
  paymentMethod: DomainRef | null;
  system: DomainRef | null;
  mailing: DomainRef | null;
  pdv: DomainRef | null;
  schedulePeriod: DomainRef | null;
  seller: UserRef;
  supervisor: UserRef | null;
  bko: UserRef | null;
  auditor: UserRef | null;
  canceledBy: UserRef | null;
  plan: PlanRef | null;
  _count: { attachments: number };
}

export type BankAccountType = "CHECKING" | "SAVINGS";

export type AttachmentKind = "AUDIO" | "PROOF_OF_ADDRESS" | "OTHER";

export interface SaleAttachment {
  id: string;
  fileName: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
  createdAt: string;
  uploadedBy: UserRef;
}

export type SaleDetail = SaleRow & { attachments: SaleAttachment[] };

export interface SalesListResponse {
  items: SaleRow[];
  total: number;
  page: number;
  perPage: number;
}

export interface SaleHistoryEntry {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  createdAt: string;
  user: UserRef | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
}

export interface SalePayload {
  customer: CustomerInput;
  planId?: string | null;
  statusId: string;
  paymentMethodId?: string;
  systemId?: string;
  mailingId?: string;
  pdvId?: string;
  amount: number;
  qty?: number;
  dueDay?: number;
  date: string;
  orderNumber?: string;
  login?: string;
  notes?: string;
  auditNote?: string;
  scheduleDate?: string | null;
  schedulePeriodId?: string | null;
  installedAt?: string | null;
  brscan?: boolean;
  bankCode?: string;
  bankAgency?: string;
  bankAgencyDigit?: string;
  bankAccount?: string;
  bankAccountDigit?: string;
  bankAccountType?: BankAccountType;
  accountHolderIsCustomer?: boolean;
  accountHolderName?: string;
  accountHolderCpf?: string;
  sellerId?: string;
  supervisorId?: string;
  bkoId?: string;
  auditorId?: string;
}

export type SaleUpdatePayload = Partial<Omit<SalePayload, "customer" | "sellerId" | "statusId">>;

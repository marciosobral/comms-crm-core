export type PlanType = "FIXED" | "INTERNET" | "COMBO";

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  speed: string | null;
  features: string[];
  basePrice: string;
  minPrice: string;
  salesScript: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserStatus = "ACTIVE" | "PENDING" | "BLOCKED" | "INACTIVE" | "DELETED";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  status: UserStatus;
  reference: string;
  isSuperAdmin: boolean;
  roleId: string | null;
  createdAt: string;
  role: { id: string; name: string } | null;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

export type DomainType = "SALE_STATUS" | "PAYMENT_METHOD" | "SYSTEM" | "MAILING" | "PDV";

export interface DomainValue {
  id: string;
  type: DomainType;
  value: string;
  active: boolean;
  order: number;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface DomainRef {
  id: string;
  value: string;
}

export interface UserRef {
  id: string;
  name: string;
}

export interface PlanRef {
  id: string;
  name: string;
  basePrice: string;
  minPrice: string;
}

export interface Customer {
  id: string;
  name: string;
  cpfCnpj: string;
  birthDate: string | null;
  motherName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  email: string | null;
  phone1: string | null;
  phone2: string | null;
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
  scheduleStart: string | null;
  scheduleEnd: string | null;
  installedAt: string | null;
  brscan: boolean | null;
  bankAgency: string | null;
  bankAccount: string | null;
  bankName: string | null;
  cancelReason: string | null;
  canceledAt: string | null;
  customer: Customer;
  status: DomainRef;
  paymentMethod: DomainRef | null;
  system: DomainRef | null;
  mailing: DomainRef | null;
  pdv: DomainRef | null;
  seller: UserRef;
  supervisor: UserRef | null;
  bko: UserRef | null;
  auditor: UserRef | null;
  canceledBy: UserRef | null;
  fixedPlan: PlanRef | null;
  internetPlan: PlanRef | null;
  _count: { attachments: number };
}

export interface SaleAttachment {
  id: string;
  fileName: string;
  mime: string;
  size: number;
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

export interface CustomerInput {
  name: string;
  cpfCnpj: string;
  birthDate?: string;
  motherName?: string;
  address?: string;
  city?: string;
  state?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
}

export interface SalePayload {
  customer: CustomerInput;
  fixedPlanId?: string;
  internetPlanId?: string;
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
  scheduleStart?: string;
  scheduleEnd?: string;
  installedAt?: string;
  brscan?: boolean;
  bankAgency?: string;
  bankAccount?: string;
  bankName?: string;
  sellerId?: string;
  supervisorId?: string;
  bkoId?: string;
  auditorId?: string;
}

export type SaleUpdatePayload = Omit<SalePayload, "customer" | "sellerId" | "statusId">;

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

export type NotificationType = "SALE_CHANGE" | "DUE_DATE";

export interface AppNotification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
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

export interface RevenueReport {
  totalAmount: number;
  monthAmount: number;
  avgTicket: number;
  conversionRate: number;
  monthlySeries: Array<{ month: string; total: number }>;
}

export interface Plan {
  id: string;
  name: string;
  typeId: string;
  type: DomainRef;
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
  lastLoginAt: string | null;
  role: { id: string; name: string } | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

export type DomainType =
  | "SALE_STATUS"
  | "PAYMENT_METHOD"
  | "SYSTEM"
  | "MAILING"
  | "PDV"
  | "PLAN_TYPE";

export interface DomainValue {
  id: string;
  type: DomainType;
  value: string;
  description: string | null;
  active: boolean;
  order: number;
  salesCount?: number;
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
  type: DomainRef;
}

export interface Address {
  id: string;
  postalCode: string | null;
  street: string | null;
  number: string | null;
  noNumber: boolean;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  isDefault: boolean;
}

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

export interface AddressInput {
  postalCode?: string;
  street?: string;
  number?: string;
  noNumber?: boolean;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  cpfCnpj: string;
  birthDate: string | null;
  motherName: string | null;
  email: string | null;
  phone1: string | null;
  phone2: string | null;
  addresses?: Address[];
}

export interface CustomerRow extends Customer {
  createdAt: string;
  updatedAt: string;
  salesCount: number;
  lastSaleDate: string | null;
}

export interface CustomersListResponse {
  items: CustomerRow[];
  total: number;
  page: number;
  perPage: number;
}

export interface CustomerSummary {
  totalSales: number;
  activeSales: number;
  monthlyRevenue: number;
  customerSince: string;
}

export interface CustomerBilling {
  paymentMethod: DomainRef | null;
  dueDay: number | null;
  pdv: DomainRef | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
}

export interface CustomerStatusCount {
  status: string;
  count: number;
}

export interface CustomerDetail {
  customer: Customer & { createdAt: string; updatedAt: string };
  summary: CustomerSummary;
  billing: CustomerBilling;
  salesByStatus: CustomerStatusCount[];
  sales: SaleRow[];
  history: SaleHistoryEntry[];
}

export interface CustomerPayload {
  name: string;
  cpfCnpj?: string;
  birthDate?: string;
  motherName?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  addresses?: AddressInput[];
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
  address: SaleAddress | null;
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
  plan: PlanRef | null;
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
  id?: string;
  name: string;
  cpfCnpj?: string;
  birthDate?: string;
  motherName?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  customerAddressId?: string;
  address?: AddressInput;
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
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  installedAt?: string | null;
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

export interface KpiDelta {
  current: number;
  previous: number;
  deltaPct: number;
}

export interface RevenueReport {
  totalAmount: number;
  monthAmount: number;
  avgTicket: number;
  conversionRate: number;
  monthlySeries: Array<{ month: string; total: number }>;
  kpiDeltas: {
    revenue: KpiDelta;
    salesCount: KpiDelta;
    avgTicket: KpiDelta;
    conversionRate: KpiDelta;
  };
  revenueByPlan: Array<{ planName: string; count: number; total: number }>;
}

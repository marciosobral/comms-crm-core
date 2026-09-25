import type { SaleHistoryEntry, SaleRow } from "./sales";
import type { DomainRef } from "./shared";

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

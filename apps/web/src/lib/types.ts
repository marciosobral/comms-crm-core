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

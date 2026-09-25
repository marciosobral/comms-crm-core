export type DomainType =
  | "SALE_STATUS"
  | "PAYMENT_METHOD"
  | "SYSTEM"
  | "MAILING"
  | "PDV"
  | "PLAN_TYPE"
  | "SCHEDULE_PERIOD";

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

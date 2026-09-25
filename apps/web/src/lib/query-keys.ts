import type { CustomersFilters } from "@/hooks/use-customers";
import type { SalesFilters } from "@/hooks/use-sales";
import type { DomainType } from "@/lib/types";

export const salesKeys = {
  all: ["sales"] as const,
  list: (filters: SalesFilters) => ["sales", filters] as const,
  detail: (id: string) => ["sale", id] as const,
  anyDetail: ["sale"] as const,
  history: (id: string) => ["sale-history", id] as const,
  anyHistory: ["sale-history"] as const,
};

export const customersKeys = {
  all: ["customers"] as const,
  list: (filters: CustomersFilters) => ["customers", filters] as const,
  newSaleSearch: (filters: CustomersFilters) => ["customers", "new-sale-search", filters] as const,
  detail: (id: string) => ["customer", id] as const,
  anyDetail: ["customer"] as const,
};

export const rolesKeys = {
  all: ["roles"] as const,
  permissionCatalog: ["permission-catalog"] as const,
};

export const usersKeys = {
  all: ["users"] as const,
};

export const plansKeys = {
  all: ["plans"] as const,
};

export const domainValuesKeys = {
  anyList: ["domain-values"] as const,
  anyActive: ["active-domain-values"] as const,
  list: (type: DomainType) => ["domain-values", type] as const,
  active: (type: DomainType) => ["active-domain-values", type] as const,
};

export const settingsKeys = {
  system: ["system-settings"] as const,
};

export const importsKeys = {
  batches: ["import-batches"] as const,
  batch: (id: string | null) => ["import-batch", id] as const,
  anyBatch: ["import-batch"] as const,
  mappings: ["import-mappings"] as const,
};

export const notificationsKeys = {
  all: ["notifications"] as const,
  unreadCount: ["notifications-unread"] as const,
};

export const reportsKeys = {
  anyRevenue: ["revenue"] as const,
  revenue: (from?: string, to?: string) => ["revenue", from, to] as const,
};

export const meKeys = {
  current: ["me"] as const,
};

export const postalCodeKeys = {
  lookup: (cep: string) => ["postal-code", cep] as const,
};

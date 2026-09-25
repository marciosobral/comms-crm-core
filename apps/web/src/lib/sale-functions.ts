export const SALE_FUNCTIONS = ["SELLER", "SUPERVISOR", "BKO", "AUDITOR"] as const;

export type SaleFunction = (typeof SALE_FUNCTIONS)[number];

export const SALE_FUNCTION_LABELS: Record<SaleFunction, string> = {
  SELLER: "Vendedor",
  SUPERVISOR: "Supervisor",
  BKO: "BKO",
  AUDITOR: "Auditor",
};

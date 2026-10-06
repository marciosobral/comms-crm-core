import { buildDateRangeWhere } from "@/common/date-range";
import type { SaleDateBy } from "@comms-crm-core/validation";
import type { Prisma } from "@prisma-client";

// Counting by installation only considers installed sales, even without a period.
export function saleDateWhere(
  dateBy: SaleDateBy = "sale",
  from?: string,
  to?: string,
): Prisma.SaleWhereInput {
  const range = buildDateRangeWhere(from, to);
  if (dateBy === "installation") return { installedAt: range ?? { not: null } };
  return range ? { date: range } : {};
}

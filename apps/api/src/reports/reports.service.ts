import { buildDateRangeWhere } from "@/common/date-range";
import type { PermissionSubject } from "@/permissions/permissions.service";
import { PrismaService } from "@/prisma/prisma.service";
import { salesToCsv } from "@/sales/sale-csv";
import { visibleSaleWhere } from "@/sales/sale-visibility";
import { DATE_ONLY_PATTERN, businessMonthKey } from "@comms-crm-core/validation";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma-client";
import {
  type PlanRevenueSaleRow,
  type RevenueSaleRow,
  aggregateRevenue,
  aggregateRevenueByPlan,
} from "./revenue";

export function revenueReferenceMonth(to?: string, now: Date = new Date()): string {
  if (to && DATE_ONLY_PATTERN.test(to)) return to.slice(0, 7);
  return businessMonthKey(now);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenue(actor: PermissionSubject & { id: string }, from?: string, to?: string) {
    const where: Prisma.SaleWhereInput = { ...visibleSaleWhere(actor) };
    const dateRange = buildDateRangeWhere(from, to);
    if (dateRange) where.date = dateRange;

    const sales = await this.prisma.sale.findMany({
      where,
      select: {
        amount: true,
        date: true,
        canceledAt: true,
        plan: { select: { name: true } },
      },
    });

    const rows: RevenueSaleRow[] = sales.map((s) => ({
      amount: s.amount.toString(),
      date: s.date,
      canceledAt: s.canceledAt,
    }));

    const planRows: PlanRevenueSaleRow[] = sales.map((s) => ({
      amount: s.amount.toString(),
      date: s.date,
      canceledAt: s.canceledAt,
      planName: s.plan?.name ?? null,
    }));

    const referenceMonth = revenueReferenceMonth(to);
    return {
      ...aggregateRevenue(rows, referenceMonth),
      revenueByPlan: aggregateRevenueByPlan(planRows, referenceMonth),
    };
  }

  async revenueCsv(actor: PermissionSubject & { id: string }, from?: string, to?: string) {
    const where: Prisma.SaleWhereInput = { ...visibleSaleWhere(actor) };
    const dateRange = buildDateRangeWhere(from, to);
    if (dateRange) where.date = dateRange;

    const sales = await this.prisma.sale.findMany({
      where,
      select: {
        amount: true,
        date: true,
        customer: {
          select: {
            name: true,
          },
        },
        plan: {
          select: {
            name: true,
          },
        },
        seller: {
          select: {
            name: true,
          },
        },
        status: {
          select: {
            value: true,
          },
        },
      },
    });

    return salesToCsv(sales);
  }
}

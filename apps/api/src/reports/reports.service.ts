import type { PermissionSubject } from "@/permissions/permissions.service";
import { PrismaService } from "@/prisma/prisma.service";
import { salesToCsv } from "@/sales/sale-csv";
import { saleDateWhere } from "@/sales/sale-date-filter";
import { visibleSaleWhere } from "@/sales/sale-visibility";
import { DATE_ONLY_PATTERN, type SaleDateBy, businessMonthKey } from "@comms-crm-core/validation";
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

  async revenue(
    actor: PermissionSubject & { id: string },
    from?: string,
    to?: string,
    dateBy: SaleDateBy = "sale",
  ) {
    const where: Prisma.SaleWhereInput = {
      ...visibleSaleWhere(actor),
      ...saleDateWhere(dateBy, from, to),
    };

    const sales = await this.prisma.sale.findMany({
      where,
      select: {
        amount: true,
        date: true,
        installedAt: true,
        canceledAt: true,
        plan: { select: { name: true } },
      },
    });

    const countedDate = (s: { date: Date; installedAt: Date | null }) =>
      (dateBy === "installation" ? s.installedAt : null) ?? s.date;

    const rows: RevenueSaleRow[] = sales.map((s) => ({
      amount: s.amount.toString(),
      date: countedDate(s),
      canceledAt: s.canceledAt,
    }));

    const planRows: PlanRevenueSaleRow[] = sales.map((s) => ({
      amount: s.amount.toString(),
      date: countedDate(s),
      canceledAt: s.canceledAt,
      planName: s.plan?.name ?? null,
    }));

    const referenceMonth = revenueReferenceMonth(to);
    return {
      ...aggregateRevenue(rows, referenceMonth),
      revenueByPlan: aggregateRevenueByPlan(planRows, referenceMonth),
    };
  }

  async revenueCsv(
    actor: PermissionSubject & { id: string },
    from?: string,
    to?: string,
    dateBy: SaleDateBy = "sale",
  ) {
    const where: Prisma.SaleWhereInput = {
      ...visibleSaleWhere(actor),
      ...saleDateWhere(dateBy, from, to),
    };

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

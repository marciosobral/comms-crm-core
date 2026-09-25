import { Injectable } from "@nestjs/common";
import { buildDateRangeWhere } from "../common/date-range";
import { PrismaService } from "../prisma/prisma.service";
import { salesToCsv } from "../sales/sale-csv";
import {
  type PlanRevenueSaleRow,
  type RevenueSaleRow,
  aggregateRevenue,
  aggregateRevenueByPlan,
} from "./revenue";

export function revenueReferenceDate(to?: string, now = new Date()): Date {
  if (!to) return now;
  const [year, month, day] = to.split("-").map(Number);
  if (!year || !month || !day) return now;
  return new Date(year, month - 1, day);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenue(from?: string, to?: string) {
    const where: Record<string, unknown> = {};
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

    const now = revenueReferenceDate(to);
    return {
      ...aggregateRevenue(rows, now),
      revenueByPlan: aggregateRevenueByPlan(planRows, now),
    };
  }

  async revenueCsv(from?: string, to?: string) {
    const where: Record<string, unknown> = {};
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

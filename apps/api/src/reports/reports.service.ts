import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  type PlanRevenueSaleRow,
  type RevenueSaleRow,
  aggregateRevenue,
  aggregateRevenueByPlan,
} from "./revenue";

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function csvField(value: string): string {
  const sanitized = value
    .replace(/[;\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^[=+\-@]/.test(sanitized)) {
    return `'${sanitized}`;
  }

  return sanitized;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenue(from?: string, to?: string) {
    const where: Record<string, unknown> = {};

    if (from || to) {
      where.date = {};
      if (from) {
        (where.date as Record<string, unknown>).gte = new Date(from);
      }
      if (to) {
        (where.date as Record<string, unknown>).lte = new Date(to);
      }
    }

    const sales = await this.prisma.sale.findMany({
      where,
      select: {
        amount: true,
        date: true,
        canceledAt: true,
        fixedPlan: { select: { name: true } },
        internetPlan: { select: { name: true } },
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
      planName: s.internetPlan?.name ?? s.fixedPlan?.name ?? null,
    }));

    const now = new Date();
    return {
      ...aggregateRevenue(rows, now),
      revenueByPlan: aggregateRevenueByPlan(planRows, now),
    };
  }

  async revenueCsv(from?: string, to?: string) {
    const where: Record<string, unknown> = {};

    if (from || to) {
      where.date = {};
      if (from) {
        (where.date as Record<string, unknown>).gte = new Date(from);
      }
      if (to) {
        (where.date as Record<string, unknown>).lte = new Date(to);
      }
    }

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
        internetPlan: {
          select: {
            name: true,
          },
        },
        fixedPlan: {
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

    const lines = ["data;cliente;plano;vendedor;status;valor"];

    for (const sale of sales) {
      const data = formatDate(sale.date);
      const cliente = csvField(sale.customer.name);
      const plano = csvField(sale.internetPlan?.name ?? sale.fixedPlan?.name ?? "—");
      const vendedor = csvField(sale.seller.name);
      const status = csvField(sale.status.value);
      const valor = Number(sale.amount).toFixed(2).replace(".", ",");

      lines.push(`${data};${cliente};${plano};${vendedor};${status};${valor}`);
    }

    return lines.join("\n");
  }
}

import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import { Button, Field, Select, TrendChip } from "@/components/ui";
import { usePermission } from "@/hooks/use-permission";
import { downloadRevenueCsv, useRevenue } from "@/hooks/use-reports";
import { useUsers } from "@/hooks/use-users";
import { APP_NAME } from "@/lib/brand";
import { formatBRL, formatCompactBRL, formatPercent } from "@/lib/format";
import { lastMonths, monthFullName, monthKey, sixMonthWindow } from "@/lib/month-labels";
import type { RevenueReport } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

export const Route = createFileRoute("/_app/receitas")({
  component: RevenuePage,
});

function RevenuePage() {
  usePageMeta({ title: "Receitas", breadcrumb: [APP_NAME, "Receitas"] });
  const canView = usePermission("reports.view");

  if (!canView) {
    return <p className="text-body text-secondary">Você não tem permissão para ver relatórios.</p>;
  }

  return <RevenueContent />;
}

function niceStep(max: number): number {
  if (max <= 0) return 50_000;
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  let niceResidual = 1;
  if (residual > 5) niceResidual = 10;
  else if (residual > 2) niceResidual = 5;
  else if (residual > 1) niceResidual = 2;
  return niceResidual * magnitude;
}

function RevenueContent() {
  const periodOptions = useMemo(() => lastMonths(6), []);
  const [period, setPeriod] = useState(() => monthKey(periodOptions[periodOptions.length - 1]));
  const [sellerId, setSellerId] = useState("");

  const canExport = usePermission("reports.export");
  const canPickSeller = usePermission("users.manage");
  const users = useUsers();

  const selectedMonth = periodOptions.find((d) => monthKey(d) === period) ?? periodOptions[0];
  const { from, to } = sixMonthWindow(selectedMonth);

  const revenue = useRevenue(from, to);
  const report = revenue.data;

  return (
    <div className="flex flex-col gap-6">
      <PageAction>
        {canExport ? (
          <Button icon={Download} variant="secondary" onClick={() => downloadRevenueCsv(from, to)}>
            Exportar
          </Button>
        ) : null}
      </PageAction>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Período" htmlFor="revenue-period">
          <Select id="revenue-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {periodOptions.map((date) => {
              const key = monthKey(date);
              return (
                <option key={key} value={key}>
                  {monthFullName(key)}/{date.getFullYear()}
                </option>
              );
            })}
          </Select>
        </Field>

        {canPickSeller ? (
          <Field label="Vendedor" htmlFor="revenue-seller">
            <Select
              id="revenue-seller"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            >
              <option value="">Todos os vendedores</option>
              {(users.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <KpiRow report={report} selectedMonth={selectedMonth} />

      <RevenueChart report={report} periodLabel={periodLabel(selectedMonth)} />

      <RevenueByPlanCard report={report} selectedMonth={selectedMonth} />
    </div>
  );
}

function periodLabel(endMonth: Date): string {
  const start = new Date(endMonth.getFullYear(), endMonth.getMonth() - 5, 1);
  return `${monthFullName(monthKey(start))} a ${monthFullName(monthKey(endMonth))}/${endMonth.getFullYear()}`;
}

function KpiRow({
  report,
  selectedMonth,
}: {
  report: RevenueReport | undefined;
  selectedMonth: Date;
}) {
  const previousMonthName = monthFullName(
    monthKey(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)),
  );

  const revenueDelta = report?.kpiDeltas.revenue;
  const salesDelta = report?.kpiDeltas.salesCount;
  const avgTicketDelta = report?.kpiDeltas.avgTicket;
  const conversionDelta = report?.kpiDeltas.conversionRate;

  const conversionPpDelta = conversionDelta
    ? (conversionDelta.current - conversionDelta.previous) * 100
    : 0;
  const salesCountDiff = salesDelta ? salesDelta.current - salesDelta.previous : 0;

  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiCard
        label="Receita no mês"
        value={report ? formatBRL(report.monthAmount) : "-"}
        delta={
          revenueDelta ? (
            <TrendChip direction={revenueDelta.deltaPct >= 0 ? "up" : "down"}>
              {revenueDelta.deltaPct >= 0 ? "+" : ""}
              {formatPercent(revenueDelta.deltaPct)} vs. {previousMonthName.toLowerCase()}
            </TrendChip>
          ) : null
        }
      />
      <KpiCard
        label="Vendas no mês"
        value={report ? String(salesDelta?.current ?? 0) : "-"}
        delta={
          salesDelta ? (
            <TrendChip direction={salesCountDiff >= 0 ? "up" : "down"}>
              {salesCountDiff >= 0 ? "+" : ""}
              {salesCountDiff} vs. {previousMonthName.toLowerCase()}
            </TrendChip>
          ) : null
        }
      />
      <KpiCard
        label="Ticket médio"
        value={report ? formatBRL(report.avgTicket) : "-"}
        delta={
          avgTicketDelta ? (
            <TrendChip direction={avgTicketDelta.deltaPct >= 0 ? "up" : "down"}>
              {avgTicketDelta.deltaPct >= 0 ? "+" : ""}
              {formatPercent(avgTicketDelta.deltaPct)} vs. {previousMonthName.toLowerCase()}
            </TrendChip>
          ) : null
        }
      />
      <KpiCard
        label="Taxa de conversão"
        value={report ? formatPercent(report.conversionRate * 100) : "-"}
        delta={
          conversionDelta ? (
            <TrendChip direction={conversionPpDelta >= 0 ? "up" : "down"}>
              {conversionPpDelta >= 0 ? "+" : ""}
              {formatPercent(conversionPpDelta)} p.p. vs. {previousMonthName.toLowerCase()}
            </TrendChip>
          ) : null
        }
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-default bg-surface p-6">
      <span className="text-eyebrow uppercase tracking-wide text-muted">{label}</span>
      <span className="text-display text-primary">{value}</span>
      {delta}
    </div>
  );
}

function RevenueChart({
  report,
  periodLabel,
}: {
  report: RevenueReport | undefined;
  periodLabel: string;
}) {
  const series = report?.monthlySeries ?? [];
  const max = Math.max(0, ...series.map((entry) => entry.total));
  const step = niceStep(max);
  const scaleMax = step * 4;
  const ticks = [4, 3, 2, 1, 0].map((n) => n * step);
  const avg = series.length > 0 ? series.reduce((sum, e) => sum + e.total, 0) / series.length : 0;
  const avgPct = scaleMax > 0 ? (avg / scaleMax) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-h3 text-primary">Receita mensal</h3>
        <span className="text-caption text-muted">{periodLabel} · valores brutos</span>
      </div>

      <div className="flex h-72 gap-3">
        <div className="flex w-16 flex-col justify-between pb-6 text-right text-caption text-muted">
          {ticks.map((t) => (
            <span key={t}>{formatCompactBRL(t)}</span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-subtle" />
            ))}
          </div>

          {avg > 0 ? (
            <div
              className="absolute inset-x-0 border-t border-dashed border-muted"
              style={{ bottom: `calc(1.5rem + ${avgPct}%)` }}
            >
              <span className="absolute left-0 -top-4 whitespace-nowrap text-caption text-muted">
                média · {formatCompactBRL(avg)}
              </span>
            </div>
          ) : null}

          <div className="absolute inset-x-0 top-0 bottom-6 flex items-stretch gap-3 px-1">
            {series.map((entry) => {
              const pct = scaleMax > 0 ? (entry.total / scaleMax) * 100 : 0;
              return (
                <div
                  key={entry.month}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  {entry.total > 0 ? (
                    <span className="text-caption text-secondary">
                      {formatCompactBRL(entry.total)}
                    </span>
                  ) : null}
                  <div
                    className="w-full rounded-t-sm bg-accent"
                    style={{ height: `${pct}%`, minHeight: entry.total > 0 ? "2px" : "0" }}
                  />
                </div>
              );
            })}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex gap-3 px-1">
            {series.map((entry) => (
              <span key={entry.month} className="flex-1 text-center text-caption text-muted">
                {monthFullName(entry.month)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueByPlanCard({
  report,
  selectedMonth,
}: {
  report: RevenueReport | undefined;
  selectedMonth: Date;
}) {
  const plans = report?.revenueByPlan ?? [];
  const totalCount = plans.reduce((sum, p) => sum + p.count, 0);
  const totalAmount = plans.reduce((sum, p) => sum + p.total, 0);
  const legend = `${monthFullName(monthKey(selectedMonth))}/${selectedMonth.getFullYear()} · ${totalCount} vendas · ${formatBRL(totalAmount)}`;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-h3 text-primary">Receita por plano</h3>
        <span className="text-caption text-muted">{legend}</span>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {plans.map((plan) => {
          const pct = totalAmount > 0 ? (plan.total / totalAmount) * 100 : 0;
          return (
            <div key={plan.planName} className="flex flex-col gap-2">
              <span className="truncate text-small text-secondary">{plan.planName}</span>
              <span className="truncate text-body-medium text-primary">
                {formatBRL(plan.total)}
              </span>
              <div className="h-1.5 w-full rounded-full bg-elevated">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-caption text-muted">{formatPercent(pct)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

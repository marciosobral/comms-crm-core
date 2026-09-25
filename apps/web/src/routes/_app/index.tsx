import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import { Badge, Button, TrendChip } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { useImportBatches } from "@/hooks/use-imports";
import { usePermission } from "@/hooks/use-permission";
import { useRevenue } from "@/hooks/use-reports";
import { useSales } from "@/hooks/use-sales";
import { formatAddressCityUf } from "@/lib/address";
import { APP_NAME } from "@/lib/brand";
import { formatBRL, formatPercent } from "@/lib/format";
import { monthFullName, monthKey, monthRange } from "@/lib/month-labels";
import { saleStatusBarColor, saleStatusToBadge } from "@/lib/sale-status";
import type { RevenueReport, SaleRow } from "@/lib/types";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileWarning, Package, Plus, Users } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function Dashboard() {
  const { user } = useCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? "";
  usePageMeta({
    title: `${greeting()}, ${firstName}`,
    breadcrumb: [APP_NAME, "Dashboard"],
  });

  const canCreate = usePermission("sales.create");
  const navigate = useNavigate();

  const now = new Date();
  const today = isoDate(now);
  const yesterday = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const { from: monthFrom, to: monthTo } = monthRange(now);

  const revenue = useRevenue();
  const salesToday = useSales({ from: today, to: today, perPage: 1 });
  const salesYesterday = useSales({ from: yesterday, to: yesterday, perPage: 1 });
  const monthSales = useSales({ from: monthFrom, to: monthTo, perPage: 100 });
  const recentSales = useSales({ perPage: 5 });
  const statuses = useActiveDomainValues("SALE_STATUS");

  const biometriaStatusId = statuses.data?.find((s) => s.value === "AG. BIOMETRIA")?.id;
  const instalacaoStatusId = statuses.data?.find((s) => s.value === "AG. INSTALAÇÃO")?.id;

  const pendingBiometria = useSales({ statusId: biometriaStatusId, perPage: 1 });
  const pendingInstall = useSales({ statusId: instalacaoStatusId, perPage: 100 });
  const canRunImports = usePermission("imports.run");
  const importBatches = useImportBatches({ enabled: canRunImports });
  const lastImportPending = [...(importBatches.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]?.stats?.pending;

  const report = revenue.data;
  const todayCount = salesToday.data?.total ?? 0;
  const yesterdayCount = salesYesterday.data?.total ?? 0;
  const todayDiff = todayCount - yesterdayCount;

  const scheduledInstalls = (pendingInstall.data?.items ?? [])
    .filter((sale) => sale.scheduleDate)
    .sort(
      (a, b) =>
        (a.scheduleDate ?? "").localeCompare(b.scheduleDate ?? "") ||
        (a.schedulePeriod?.value ?? "").localeCompare(b.schedulePeriod?.value ?? ""),
    )
    .slice(0, 5);
  const unscheduledCount = (pendingInstall.data?.items ?? []).filter((s) => !s.scheduleDate).length;

  return (
    <div className="flex flex-col gap-6">
      {canCreate ? (
        <PageAction>
          <Button icon={Plus} onClick={() => navigate({ to: "/vendas/nova" })}>
            Nova Venda
          </Button>
        </PageAction>
      ) : null}

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Vendas hoje"
          value={String(todayCount)}
          delta={
            <TrendChip direction={todayDiff >= 0 ? "up" : "down"}>
              {todayDiff >= 0 ? "+" : ""}
              {todayDiff} vs. ontem
            </TrendChip>
          }
        />
        <KpiCard
          label="Vendas no mês"
          value={report ? String(report.kpiDeltas.salesCount.current) : "-"}
          delta={
            report ? (
              <TrendChip direction={report.kpiDeltas.salesCount.deltaPct >= 0 ? "up" : "down"}>
                {report.kpiDeltas.salesCount.deltaPct >= 0 ? "+" : ""}
                {formatPercent(report.kpiDeltas.salesCount.deltaPct, 0)} vs. mês anterior
              </TrendChip>
            ) : null
          }
        />
        <KpiCard
          label="Receita no mês"
          value={report ? formatBRL(report.monthAmount) : "-"}
          delta={
            report ? (
              <TrendChip direction={report.kpiDeltas.revenue.deltaPct >= 0 ? "up" : "down"}>
                {report.kpiDeltas.revenue.deltaPct >= 0 ? "+" : ""}
                {formatPercent(report.kpiDeltas.revenue.deltaPct, 0)} vs. mês anterior
              </TrendChip>
            ) : null
          }
        />
        <KpiCard
          label="Ticket médio"
          value={report ? formatBRL(report.avgTicket) : "-"}
          delta={
            report ? (
              <TrendChip direction={report.kpiDeltas.avgTicket.deltaPct >= 0 ? "up" : "down"}>
                {report.kpiDeltas.avgTicket.deltaPct >= 0 ? "+" : ""}
                {formatPercent(report.kpiDeltas.avgTicket.deltaPct, 0)} vs. mês anterior
              </TrendChip>
            ) : null
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SalesStatusCard sales={monthSales.data?.items ?? []} report={report} />
        <UpcomingInstallsCard sales={scheduledInstalls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PendingOpsCard
          biometriaCount={pendingBiometria.data?.total ?? 0}
          unscheduledCount={unscheduledCount}
          lastImportPending={canRunImports ? lastImportPending : undefined}
        />
        <RecentSalesCard sales={recentSales.data?.items ?? []} />
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-default bg-surface p-6">
      <span className="text-eyebrow uppercase tracking-wide text-muted">{label}</span>
      <span className="text-display text-primary">{value}</span>
      {delta}
    </div>
  );
}

function SalesStatusCard({
  sales,
  report,
}: {
  sales: SaleRow[];
  report: RevenueReport | undefined;
}) {
  const now = new Date();
  const byStatus = new Map<string, number>();
  for (const sale of sales) {
    byStatus.set(sale.status.value, (byStatus.get(sale.status.value) ?? 0) + 1);
  }
  const entries = [...byStatus.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, count]) => count));

  const totalCount = sales.length;
  const totalAmount = report?.monthAmount ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-h3 text-primary">Status das vendas do mês</h3>
        <span className="text-caption text-muted uppercase">
          {monthFullName(monthKey(now))}/{now.getFullYear()}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-3">
            <Badge status={saleStatusToBadge(status)} />
            <div className="h-1.5 flex-1 rounded-full bg-elevated">
              <div
                className={`h-1.5 rounded-full ${saleStatusBarColor(status)}`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-small text-secondary">{count}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-subtle pt-3">
        <span className="text-caption text-muted">Total no mês</span>
        <span className="text-small text-secondary">
          {totalCount} vendas · {formatBRL(totalAmount)}
        </span>
      </div>
    </div>
  );
}

function UpcomingInstallsCard({ sales }: { sales: SaleRow[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-h3 text-primary">Próximas instalações</h3>
        <span className="text-caption text-muted">{sales.length} agendadas</span>
      </div>

      <div className="flex flex-col divide-y divide-subtle">
        {sales.length === 0 ? (
          <p className="py-4 text-body text-muted">Nenhuma instalação agendada.</p>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-small text-secondary">
                  {sale.scheduleDate ? formatDayMonth(sale.scheduleDate) : "-"} ·{" "}
                  {sale.schedulePeriod?.value ?? "Sem período"}
                </span>
                <span className="text-body-medium text-primary">{sale.customer.name}</span>
              </div>
              <span className="text-caption text-muted">{formatAddressCityUf(sale.address)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PendingOpsCard({
  biometriaCount,
  unscheduledCount,
  lastImportPending,
}: {
  biometriaCount: number;
  unscheduledCount: number;
  lastImportPending?: number;
}) {
  const items = [
    { icon: Users, label: "Vendas aguardando biometria", count: biometriaCount },
    { icon: Package, label: "Instalações sem data agendada", count: unscheduledCount },
    ...(lastImportPending !== undefined
      ? [
          {
            icon: FileWarning,
            label: "Linhas pendentes na última importação",
            count: lastImportPending,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-h3 text-primary">Pendências da operação</h3>
        <span className="text-caption text-muted">Requer ação</span>
      </div>

      <div className="flex flex-col divide-y divide-subtle">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 py-3">
            <item.icon size={16} className="text-muted" aria-hidden />
            <span className="flex-1 text-small text-secondary">{item.label}</span>
            <span className="text-body-medium text-primary">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentSalesCard({ sales }: { sales: SaleRow[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-h3 text-primary">Vendas recentes</h3>
        <span className="text-caption text-muted">Últimas {sales.length}</span>
      </div>

      <div className="flex flex-col divide-y divide-subtle">
        {sales.map((sale) => (
          <Link
            key={sale.id}
            to="/vendas/$saleId"
            params={{ saleId: sale.id }}
            className="flex items-center gap-3 py-3 hover:opacity-80"
          >
            <span className="w-40 truncate text-small text-muted">{sale.orderNumber ?? "-"}</span>
            <span className="flex-1 truncate text-small text-secondary">{sale.customer.name}</span>
            <span className="w-24 text-right text-small text-primary">
              {formatBRL(sale.amount)}
            </span>
            <Badge status={saleStatusToBadge(sale.status.value)} />
          </Link>
        ))}
      </div>
    </div>
  );
}

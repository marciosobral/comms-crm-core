import { Button, Field, Input } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { downloadRevenueCsv, useRevenue } from "@/hooks/use-reports";
import { formatBRL } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";
import { usePageMeta } from "../_app";

export const Route = createFileRoute("/_app/receitas")({
  component: RevenuePage,
});

const MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function monthLabel(month: string): string {
  const index = Number(month.split("-")[1]) - 1;
  return MONTH_LABELS[index] ?? month;
}

function RevenuePage() {
  usePageMeta({ title: "Receitas", breadcrumb: ["CRM", "Receitas"] });
  const { user } = useCurrentUser();

  const canView = hasPermission(
    user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
    "reports.view",
  );

  if (!canView) {
    return <p className="text-body text-secondary">Você não tem permissão para ver relatórios.</p>;
  }

  return <RevenueContent />;
}

function RevenueContent() {
  const { user } = useCurrentUser();
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const canExport = hasPermission(
    user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
    "reports.export",
  );

  const revenue = useRevenue(from, to);
  const report = revenue.data;
  const maxTotal = Math.max(0, ...(report?.monthlySeries ?? []).map((entry) => entry.total));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <div className="w-48">
            <Field label="De" htmlFor="revenue-from">
              <Input
                id="revenue-from"
                type="date"
                value={from ?? ""}
                onChange={(e) => setFrom(e.target.value || undefined)}
              />
            </Field>
          </div>

          <div className="w-48">
            <Field label="Até" htmlFor="revenue-to">
              <Input
                id="revenue-to"
                type="date"
                value={to ?? ""}
                onChange={(e) => setTo(e.target.value || undefined)}
              />
            </Field>
          </div>
        </div>

        {canExport ? (
          <Button icon={Download} variant="secondary" onClick={() => downloadRevenueCsv(from, to)}>
            Exportar CSV
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Receita total" value={report ? formatBRL(report.totalAmount) : "—"} />
        <KpiCard label="Receita do mês" value={report ? formatBRL(report.monthAmount) : "—"} />
        <KpiCard label="Ticket médio" value={report ? formatBRL(report.avgTicket) : "—"} />
        <KpiCard
          label="Conversão"
          value={report ? `${(report.conversionRate * 100).toFixed(1)}%` : "—"}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
        <h3 className="text-h3 text-primary">Receita mensal</h3>

        <div className="flex h-48 items-end gap-3">
          {(report?.monthlySeries ?? []).map((entry) => {
            const pct = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0;
            return (
              <div
                key={entry.month}
                className="flex flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-caption text-secondary">{formatBRL(entry.total)}</span>
                {entry.total > 0 ? (
                  <div className="w-full rounded-t-sm bg-accent" style={{ height: `${pct}%` }} />
                ) : (
                  <div className="w-full rounded-t-sm bg-elevated" style={{ height: "2px" }} />
                )}
                <span className="text-caption text-muted">{monthLabel(entry.month)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-default bg-surface p-6">
      <span className="text-caption text-muted">{label}</span>
      <span className="text-display text-primary">{value}</span>
    </div>
  );
}

import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import { ActionMenu, ActionMenuItem, Badge, Button, Field, Select, TBody, TD, TH, THead, TR } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCustomers } from "@/hooks/use-customers";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { usePlans } from "@/hooks/use-plans";
import { type SalesFilters, useSales } from "@/hooks/use-sales";
import { useUsers } from "@/hooks/use-users";
import { formatBRL, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { saleStatusToBadge } from "@/lib/sale-status";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/vendas/")({
  component: SalesPage,
});

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let back = 0; back < 6; back++) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: `${MONTH_LABELS[d.getMonth()]}/${d.getFullYear()}` });
  }
  return options;
}

function monthToRange(value: string): { from: string; to: string } {
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    from: `${yearStr}-${monthStr}-01`,
    to: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

function SalesPage() {
  usePageMeta({ title: "Vendas", breadcrumb: ["CRM", "Vendas"] });
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const subject = user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null;
  const canCreate = hasPermission(subject, "sales.create");
  const canPickSeller = hasPermission(subject, "users.manage");

  const [filters, setFilters] = useState<Omit<SalesFilters, "from" | "to">>({
    page: 1,
    perPage: 20,
  });
  const [month, setMonth] = useState(currentMonthValue());
  const range = monthToRange(month);
  const effectiveFilters: SalesFilters = { ...filters, ...range };
  const sales = useSales(effectiveFilters);
  const statuses = useActiveDomainValues("SALE_STATUS");
  const plans = usePlans();
  const users = useUsers();
  const facetCustomers = useCustomers({ page: 1, perPage: 500 });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const row of facetCustomers.data?.items ?? []) {
      if (row.city) set.add(row.city);
    }
    return Array.from(set).sort();
  }, [facetCustomers.data]);

  const setFilter = (patch: Partial<Omit<SalesFilters, "from" | "to">>) =>
    setFilters((current) => ({ ...current, ...patch, page: 1 }));

  const onMonthChange = (value: string) => {
    setMonth(value);
    setFilters((current) => ({ ...current, page: 1 }));
  };

  const total = sales.data?.total ?? 0;
  const page = sales.data?.page ?? 1;
  const perPage = sales.data?.perPage ?? 20;
  const firstShown = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastShown = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col gap-6">
      {canCreate ? (
        <PageAction>
          <Button icon={Plus} onClick={() => navigate({ to: "/vendas/nova" })}>
            Nova Venda
          </Button>
        </PageAction>
      ) : null}

      <div className="grid grid-cols-5 gap-3">
        <Field label="Status" htmlFor="filter-status">
          <Select
            id="filter-status"
            value={filters.statusId ?? ""}
            onChange={(e) => setFilter({ statusId: e.target.value || undefined })}
          >
            <option value="">Todos os status</option>
            {(statuses.data ?? []).map((status) => (
              <option key={status.id} value={status.id}>
                {status.value}
              </option>
            ))}
          </Select>
        </Field>

        {canPickSeller ? (
          <Field label="Vendedor" htmlFor="filter-seller">
            <Select
              id="filter-seller"
              value={filters.sellerId ?? ""}
              onChange={(e) => setFilter({ sellerId: e.target.value || undefined })}
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

        <Field label="Período" htmlFor="filter-month">
          <Select id="filter-month" value={month} onChange={(e) => onMonthChange(e.target.value)}>
            {monthOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Plano" htmlFor="filter-plan">
          <Select
            id="filter-plan"
            value={filters.planId ?? ""}
            onChange={(e) => setFilter({ planId: e.target.value || undefined })}
          >
            <option value="">Todos os planos</option>
            {(plans.data ?? []).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cidade" htmlFor="filter-city">
          <Select
            id="filter-city"
            value={filters.city ?? ""}
            onChange={(e) => setFilter({ city: e.target.value || undefined })}
          >
            <option value="">Todas as cidades</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="overflow-hidden rounded-lg border border-default bg-surface">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <THead>
            <tr>
              <TH>Ordem</TH>
              <TH>Cliente</TH>
              <TH>CPF/CNPJ</TH>
              <TH>Plano</TH>
              <TH align="right">Valor</TH>
              <TH>Vendedor</TH>
              <TH>Status</TH>
              <TH>Data</TH>
              <TH align="right">Ações</TH>
            </tr>
          </THead>
          <TBody>
            {(sales.data?.items ?? []).map((sale) => (
              <TR key={sale.id}>
                <TD emphasis>{sale.orderNumber ?? "-"}</TD>
                <TD emphasis>{sale.customer.name}</TD>
                <TD>{sale.customer.cpfCnpj}</TD>
                <TD>{sale.internetPlan?.name ?? sale.fixedPlan?.name ?? "-"}</TD>
                <TD align="right" emphasis>
                  {formatBRL(sale.amount)}
                </TD>
                <TD>{sale.seller.name}</TD>
                <TD truncate={false}>
                  <Badge status={saleStatusToBadge(sale.status.value)} />
                </TD>
                <TD>{formatDate(sale.date)}</TD>
                <TD align="right" truncate={false}>
                  <ActionMenu
                    label={`Ações para a venda ${sale.orderNumber ?? sale.customer.name}`}
                    open={openMenuId === sale.id}
                    onOpenChange={(open) => setOpenMenuId(open ? sale.id : null)}
                  >
                    <ActionMenuItem
                      onClick={() => {
                        setOpenMenuId(null);
                        navigate({ to: "/vendas/$saleId", params: { saleId: sale.id } });
                      }}
                    >
                      Ver detalhes
                    </ActionMenuItem>
                  </ActionMenu>
                </TD>
              </TR>
            ))}
          </TBody>
        </table>

        <div className="flex items-center justify-between border-t border-subtle px-6 py-4">
          <span className="text-caption text-muted">
            Mostrando {firstShown}–{lastShown} de {total} vendas
          </span>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setFilters((c) => ({ ...c, page: page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={lastShown >= total}
              onClick={() => setFilters((c) => ({ ...c, page: page + 1 }))}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

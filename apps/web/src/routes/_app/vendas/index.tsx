import { SalesTable } from "@/components/sales/sales-table";
import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import { Button, Field, Pagination, Select } from "@/components/ui";
import { useCustomers } from "@/hooks/use-customers";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { usePermission } from "@/hooks/use-permission";
import { usePlans } from "@/hooks/use-plans";
import { type SalesFilters, useSales } from "@/hooks/use-sales";
import { useUsers } from "@/hooks/use-users";
import { uniqueAddressCities, uniqueSaleCities } from "@/lib/address";
import { APP_NAME } from "@/lib/brand";
import { monthKey, monthOptions, monthToRange } from "@/lib/month-labels";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/vendas/")({
  component: SalesPage,
});

function SalesPage() {
  usePageMeta({ title: "Vendas", breadcrumb: [APP_NAME, "Vendas"] });
  const navigate = useNavigate();
  const canCreate = usePermission("sales.create");
  const canPickSeller = usePermission("users.manage");

  const [filters, setFilters] = useState<Omit<SalesFilters, "from" | "to">>({
    page: 1,
    perPage: 20,
  });
  const [month, setMonth] = useState(monthKey(new Date()));
  const range = monthToRange(month);
  const effectiveFilters: SalesFilters = { ...filters, ...range };
  const sales = useSales(effectiveFilters);
  const statuses = useActiveDomainValues("SALE_STATUS");
  const plans = usePlans();
  const users = useUsers();
  const facetCustomers = useCustomers({ page: 1, perPage: 500 });

  const cities = useMemo(() => {
    const fromCustomers = uniqueAddressCities(facetCustomers.data?.items ?? []);
    const fromSales = uniqueSaleCities(sales.data?.items ?? []);
    return Array.from(new Set([...fromCustomers, ...fromSales])).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [facetCustomers.data, sales.data]);

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

      <SalesTable
        sales={sales.data?.items ?? []}
        emphasizeCustomerName
        footer={
          <Pagination
            firstShown={firstShown}
            lastShown={lastShown}
            total={total}
            noun="vendas"
            hasPrevious={page > 1}
            hasNext={lastShown < total}
            onPrevious={() => setFilters((c) => ({ ...c, page: page - 1 }))}
            onNext={() => setFilters((c) => ({ ...c, page: page + 1 }))}
          />
        }
      />
    </div>
  );
}

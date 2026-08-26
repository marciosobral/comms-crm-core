import {
  Badge,
  Button,
  Field,
  Input,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { usePlans } from "@/hooks/use-plans";
import { type SalesFilters, useSales } from "@/hooks/use-sales";
import { useUsers } from "@/hooks/use-users";
import { formatBRL, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { saleStatusToBadge } from "@/lib/sale-status";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { usePageMeta } from "../../_app";

export const Route = createFileRoute("/_app/vendas/")({
  component: SalesPage,
});

function SalesPage() {
  usePageMeta({ title: "Vendas", breadcrumb: ["CRM", "Vendas"] });
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const subject = user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null;
  const canCreate = hasPermission(subject, "sales.create");
  const canPickSeller = hasPermission(subject, "users.manage");

  const [filters, setFilters] = useState<SalesFilters>({ page: 1, perPage: 20 });
  const sales = useSales(filters);
  const statuses = useActiveDomainValues("SALE_STATUS");
  const plans = usePlans();
  const users = useUsers();

  const setFilter = (patch: Partial<SalesFilters>) =>
    setFilters((current) => ({ ...current, ...patch, page: 1 }));

  const total = sales.data?.total ?? 0;
  const page = sales.data?.page ?? 1;
  const perPage = sales.data?.perPage ?? 20;
  const firstShown = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastShown = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="grid flex-1 grid-cols-5 gap-3">
          <Field label="Status" htmlFor="filter-status">
            <Select
              id="filter-status"
              value={filters.statusId ?? ""}
              onChange={(e) => setFilter({ statusId: e.target.value || undefined })}
            >
              <option value="">Todos</option>
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
                <option value="">Todos</option>
                {(users.data ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Plano" htmlFor="filter-plan">
            <Select
              id="filter-plan"
              value={filters.planId ?? ""}
              onChange={(e) => setFilter({ planId: e.target.value || undefined })}
            >
              <option value="">Todos</option>
              {(plans.data ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="De" htmlFor="filter-from">
            <Input
              id="filter-from"
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFilter({ from: e.target.value || undefined })}
            />
          </Field>

          <Field label="Até" htmlFor="filter-to">
            <Input
              id="filter-to"
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => setFilter({ to: e.target.value || undefined })}
            />
          </Field>
        </div>

        {canCreate ? (
          <Button icon={Plus} onClick={() => navigate({ to: "/vendas/nova" })}>
            Nova Venda
          </Button>
        ) : null}
      </div>

      <Table>
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
              <TD emphasis>{sale.orderNumber ?? "—"}</TD>
              <TD emphasis>{sale.customer.name}</TD>
              <TD>{sale.customer.cpfCnpj}</TD>
              <TD>{sale.internetPlan?.name ?? sale.fixedPlan?.name ?? "—"}</TD>
              <TD align="right" emphasis>
                {formatBRL(sale.amount)}
              </TD>
              <TD>{sale.seller.name}</TD>
              <TD>
                <Badge status={saleStatusToBadge(sale.status.value)} />
              </TD>
              <TD>{formatDate(sale.date)}</TD>
              <TD align="right">
                <Link
                  to="/vendas/$saleId"
                  params={{ saleId: sale.id }}
                  className="text-small text-accent hover:text-accent-hover"
                >
                  Detalhes
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <div className="flex items-center justify-between">
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
  );
}

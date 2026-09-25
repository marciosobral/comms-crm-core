import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import {
  ActionMenu,
  ActionMenuItem,
  Button,
  Field,
  Input,
  Pagination,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { type CustomersFilters, useCustomers } from "@/hooks/use-customers";
import { usePermission } from "@/hooks/use-permission";
import { useRowMenu } from "@/hooks/use-row-menu";
import { useUsers } from "@/hooks/use-users";
import {
  defaultAddress,
  formatAddressCityUf,
  uniqueAddressCities,
  uniqueAddressStates,
} from "@/lib/address";
import { APP_NAME } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { monthOptions } from "@/lib/month-labels";
import type { CustomerRow } from "@/lib/types";
import { formatDisplayCpfCnpj, formatPhone } from "@comms-crm-core/validation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/clientes/")({
  component: CustomersPage,
});

function CustomersPage() {
  usePageMeta({ title: "Clientes", breadcrumb: [APP_NAME, "Clientes"] });
  const navigate = useNavigate();
  const canEdit = usePermission("customers.edit");
  const canPickSeller = usePermission("users.manage");

  const [filters, setFilters] = useState<CustomersFilters>({
    page: 1,
    perPage: 12,
  });
  const customers = useCustomers(filters);
  const facetCustomers = useCustomers({ page: 1, perPage: 500 });
  const users = useUsers();
  const [modal, setModal] = useState<{ open: boolean; customer: CustomerRow | null }>({
    open: false,
    customer: null,
  });
  const rowMenu = useRowMenu();

  const cities = useMemo(
    () => uniqueAddressCities(facetCustomers.data?.items ?? []),
    [facetCustomers.data],
  );

  const states = useMemo(
    () => uniqueAddressStates(facetCustomers.data?.items ?? []),
    [facetCustomers.data],
  );

  const setFilter = (patch: Partial<CustomersFilters>) =>
    setFilters((current) => ({ ...current, ...patch, page: 1 }));

  const total = customers.data?.total ?? 0;
  const page = customers.data?.page ?? 1;
  const perPage = customers.data?.perPage ?? 12;
  const firstShown = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastShown = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col gap-6">
      {canEdit ? (
        <PageAction>
          <Button icon={Plus} onClick={() => setModal({ open: true, customer: null })}>
            Novo Cliente
          </Button>
        </PageAction>
      ) : null}

      <div className="grid grid-cols-5 gap-3">
        <Field label="Busca" htmlFor="filter-q">
          <Input
            id="filter-q"
            placeholder="Nome, CPF ou contato"
            value={filters.q ?? ""}
            onChange={(e) => setFilter({ q: e.target.value || undefined })}
          />
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

        <Field label="UF" htmlFor="filter-state">
          <Select
            id="filter-state"
            value={filters.state ?? ""}
            onChange={(e) => setFilter({ state: e.target.value || undefined })}
          >
            <option value="">Todas</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
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
          <Select
            id="filter-month"
            value={filters.month ?? ""}
            onChange={(e) => setFilter({ month: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            {monthOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Table
        footer={
          <Pagination
            firstShown={firstShown}
            lastShown={lastShown}
            total={total}
            noun="clientes"
            hasPrevious={page > 1}
            hasNext={lastShown < total}
            onPrevious={() => setFilters((c) => ({ ...c, page: page - 1 }))}
            onNext={() => setFilters((c) => ({ ...c, page: page + 1 }))}
          />
        }
      >
        <colgroup>
          <col className="w-[19%]" />
          <col className="w-[16%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[9%]" />
          <col className="w-[6%]" />
          <col className="w-[15%]" />
          <col className="w-[7%]" />
        </colgroup>
        <THead>
          <tr>
            <TH>Cliente</TH>
            <TH>CPF/CNPJ</TH>
            <TH>Contato 1</TH>
            <TH>E-mail</TH>
            <TH>Cidade/UF</TH>
            <TH align="right">Vendas</TH>
            <TH className="whitespace-nowrap">Última venda</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {(customers.data?.items ?? []).map((customer) => (
            <TR
              key={customer.id}
              onClick={() =>
                navigate({ to: "/clientes/$customerId", params: { customerId: customer.id } })
              }
            >
              <TD emphasis>{customer.name}</TD>
              <TD>{customer.cpfCnpj ? formatDisplayCpfCnpj(customer.cpfCnpj) : "-"}</TD>
              <TD>{customer.phone1 ? formatPhone(customer.phone1) : "-"}</TD>
              <TD>{customer.email ?? "-"}</TD>
              <TD>{formatAddressCityUf(defaultAddress(customer.addresses ?? []))}</TD>
              <TD align="right" emphasis>
                {String(customer.salesCount)}
              </TD>
              <TD>{customer.lastSaleDate ? formatDate(customer.lastSaleDate) : "-"}</TD>
              <TD align="right" truncate={false}>
                <ActionMenu
                  label={`Ações para ${customer.name}`}
                  open={rowMenu.isOpen(customer.id)}
                  onOpenChange={rowMenu.onOpenChange(customer.id)}
                >
                  <ActionMenuItem
                    onClick={() => {
                      rowMenu.close();
                      navigate({
                        to: "/clientes/$customerId",
                        params: { customerId: customer.id },
                      });
                    }}
                  >
                    Ver detalhes
                  </ActionMenuItem>
                  {canEdit ? (
                    <ActionMenuItem
                      onClick={() => {
                        rowMenu.close();
                        setModal({ open: true, customer });
                      }}
                    >
                      Editar
                    </ActionMenuItem>
                  ) : null}
                </ActionMenu>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {modal.open ? (
        <CustomerFormModal
          customer={modal.customer}
          onClose={() => setModal({ open: false, customer: null })}
        />
      ) : null}
    </div>
  );
}

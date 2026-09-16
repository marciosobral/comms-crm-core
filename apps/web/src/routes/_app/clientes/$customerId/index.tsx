import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { CustomerHistory } from "@/components/customers/customer-history";
import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import {
  ActionMenu,
  ActionMenuItem,
  Badge,
  Button,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { downloadCustomerHistoryCsv, useCustomer } from "@/hooks/use-customers";
import { formatAddressLine } from "@/lib/address";
import { formatBRL, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { saleStatusToBadge } from "@/lib/sale-status";
import { formatCep, formatCpfCnpj, formatPhone } from "@comms-core/validation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

export const Route = createFileRoute("/_app/clientes/$customerId/")({
  component: CustomerDetailPage,
});

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-muted">{label}</span>
      <span className="text-body text-primary">{children}</span>
    </div>
  );
}

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const subject = user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null;
  const canEdit = hasPermission(subject, "customers.edit");

  const customer = useCustomer(customerId);
  const [editOpen, setEditOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  usePageMeta({
    title: customer.data ? `Cliente ${customer.data.customer.name}` : "Cliente",
    breadcrumb: ["CRM", "Clientes", customer.data?.customer.name ?? ""],
  });

  if (!customer.data) {
    return (
      <p className="text-body text-secondary">
        {customer.isError ? "Cliente não encontrado ou sem acesso." : "Carregando..."}
      </p>
    );
  }

  const data = customer.data;
  const { customer: c, summary, billing, salesByStatus, sales, history } = data;

  return (
    <div className="flex flex-col gap-6">
      {canEdit ? (
        <PageAction>
          <Button onClick={() => setEditOpen(true)}>Editar cliente</Button>
        </PageAction>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate({ to: "/vendas/nova" })}>
            Nova Venda
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => downloadCustomerHistoryCsv(customerId)}
          >
            Exportar histórico
          </Button>
        </div>
        <span className="text-small text-muted">Excluir cliente - sem permissão</span>
      </div>

      <div className="grid grid-cols-[2fr_1fr] items-start gap-6">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Dados do cliente</h3>
            <div className="grid grid-cols-3 gap-4">
              <Item label="Nome / Razão social">{c.name}</Item>
              <Item label="CPF / CNPJ">{c.cpfCnpj ? formatCpfCnpj(c.cpfCnpj) : "-"}</Item>
              <Item label="Data de nascimento">{c.birthDate ? formatDate(c.birthDate) : "-"}</Item>
              <Item label="Nome da mãe">{c.motherName ?? "-"}</Item>
              <Item label="E-mail">{c.email ?? "-"}</Item>
              <Item label="Contato 1">{c.phone1 ? formatPhone(c.phone1) : "-"}</Item>
              <Item label="Contato 2">{c.phone2 ? formatPhone(c.phone2) : "-"}</Item>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Endereços</h3>
            {(c.addresses ?? []).length === 0 ? (
              <p className="text-body text-secondary">Nenhum endereço cadastrado.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {(c.addresses ?? []).map((address) => (
                  <li key={address.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body-medium text-primary">
                        {formatAddressLine(address)}
                      </span>
                      {address.isDefault ? <Badge status="ativo" label="Padrão" /> : null}
                    </div>
                    <span className="text-caption text-muted">
                      CEP {address.postalCode ? formatCep(address.postalCode) : "-"}
                      {address.complement ? ` · ${address.complement}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Cobrança e origem</h3>
            <div className="grid grid-cols-3 gap-4">
              <Item label="Forma de pagamento">{billing.paymentMethod?.value ?? "-"}</Item>
              <Item label="Vencimento">{billing.dueDay ? `Dia ${billing.dueDay}` : "-"}</Item>
              <Item label="PDV">{billing.pdv?.value ?? "-"}</Item>
              <Item label="Banco">{billing.bankName ?? "-"}</Item>
              <Item label="Agência">{billing.bankAgency ?? "-"}</Item>
              <Item label="Conta">{billing.bankAccount ?? "-"}</Item>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Observações</h3>
            <p className="text-body text-secondary">Sem observações registradas.</p>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Resumo</h3>
            <div className="grid grid-cols-2 gap-4">
              <Item label="Total de vendas">{String(summary.totalSales)}</Item>
              <Item label="Vendas ativas">{String(summary.activeSales)}</Item>
              <Item label="Receita mensal">{formatBRL(summary.monthlyRevenue)}</Item>
              <Item label="Cliente desde">{formatDate(summary.customerSince)}</Item>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Vendas por status</h3>
            {salesByStatus.length === 0 ? (
              <p className="text-body text-secondary">Nenhuma venda registrada.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {salesByStatus.map((row) => (
                  <li key={row.status} className="flex items-center justify-between">
                    <Badge status={saleStatusToBadge(row.status)} />
                    <span className="text-body text-secondary">
                      {row.count} {row.count === 1 ? "venda" : "vendas"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CustomerHistory entries={history} />
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-h3 text-primary">Vendas do cliente</h3>
          <span className="text-small text-muted">
            {sales.length} {sales.length === 1 ? "venda" : "vendas"} ·{" "}
            {formatBRL(summary.monthlyRevenue)} de receita mensal
          </span>
        </div>
        <Table bare>
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
            {sales.map((sale) => (
              <TR
                key={sale.id}
                onClick={() => navigate({ to: "/vendas/$saleId", params: { saleId: sale.id } })}
              >
                <TD emphasis>{sale.orderNumber ?? "-"}</TD>
                <TD>{sale.customer.name}</TD>
                <TD>{sale.customer.cpfCnpj ? formatCpfCnpj(sale.customer.cpfCnpj) : "-"}</TD>
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
        </Table>
      </section>

      {editOpen ? <CustomerFormModal customer={c} onClose={() => setEditOpen(false)} /> : null}
    </div>
  );
}

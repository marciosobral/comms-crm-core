import { SaleActions } from "@/components/sales/sale-actions";
import { SaleAttachments } from "@/components/sales/sale-attachments";
import { SaleHistory } from "@/components/sales/sale-history";
import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import { Badge, Button } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSale } from "@/hooks/use-sales";
import { APP_NAME } from "@/lib/brand";
import { formatBRL, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { saleStatusToBadge } from "@/lib/sale-status";
import { formatCep, formatDisplayCpfCnpj, formatPhone } from "@comms-core/validation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_app/vendas/$saleId/")({
  component: SaleDetailPage,
});

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-muted">{label}</span>
      <span className="text-body text-primary">{children}</span>
    </div>
  );
}

function SaleDetailPage() {
  const { saleId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const sale = useSale(saleId);
  const orderLabel = sale.data?.orderNumber ?? sale.data?.id;
  const breadcrumbTail = orderLabel;
  usePageMeta({
    title: orderLabel ? `Venda ${orderLabel}` : "Venda",
    breadcrumb: breadcrumbTail ? [APP_NAME, "Vendas", breadcrumbTail] : [APP_NAME, "Vendas"],
  });

  if (!sale.data) {
    return (
      <p className="text-body text-secondary">
        {sale.isError ? "Venda não encontrada ou sem acesso." : "Carregando..."}
      </p>
    );
  }
  const data = sale.data;
  const subject = user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null;
  const canEdit = hasPermission(subject, "sales.edit") && data.canceledAt === null;

  return (
    <div className="flex flex-col gap-6">
      {canEdit ? (
        <PageAction>
          <Button
            onClick={() => navigate({ to: "/vendas/$saleId/editar", params: { saleId: data.id } })}
          >
            Editar venda
          </Button>
        </PageAction>
      ) : null}

      <SaleActions
        sale={data}
        canChangeStatus={hasPermission(subject, "sales.change_status")}
        canAudit={hasPermission(subject, "sales.audit")}
        canEdit={hasPermission(subject, "sales.edit")}
        canChangeSeller={
          hasPermission(subject, "sales.change_seller") && hasPermission(subject, "users.manage")
        }
      />

      {data.canceledAt ? (
        <div className="rounded-lg border border-danger-border bg-danger-subtle p-4">
          <p className="text-body text-danger">
            Cancelada em {formatDate(data.canceledAt)} por {data.canceledBy?.name ?? "-"} -{" "}
            {data.cancelReason}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-[2fr_1fr] items-start gap-6">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Cliente</h3>
            <div className="grid grid-cols-3 gap-4">
              <Item label="Nome / Razão social">{data.customer.name}</Item>
              <Item label="CPF/CNPJ">
                {data.customer.cpfCnpj ? formatDisplayCpfCnpj(data.customer.cpfCnpj) : "-"}
              </Item>
              <Item label="Data de nascimento">
                {data.customer.birthDate ? formatDate(data.customer.birthDate) : "-"}
              </Item>
              <Item label="Nome da mãe">{data.customer.motherName ?? "-"}</Item>
              <Item label="E-mail">{data.customer.email ?? "-"}</Item>
              <Item label="Contato 1">
                {data.customer.phone1 ? formatPhone(data.customer.phone1) : "-"}
              </Item>
              <Item label="Contato 2">
                {data.customer.phone2 ? formatPhone(data.customer.phone2) : "-"}
              </Item>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Endereço da venda</h3>
            <div className="grid grid-cols-3 gap-4">
              <Item label="CEP">
                {data.address?.postalCode ? formatCep(data.address.postalCode) : "-"}
              </Item>
              <Item label="Logradouro">{data.address?.street ?? "-"}</Item>
              <Item label="Número">
                {data.address?.noNumber ? "S/N" : (data.address?.number ?? "-")}
              </Item>
              <Item label="Complemento">{data.address?.complement ?? "-"}</Item>
              <Item label="Bairro">{data.address?.neighborhood ?? "-"}</Item>
              <Item label="Cidade / UF">
                {data.address?.city ?? "-"}
                {data.address?.state ? ` / ${data.address.state}` : ""}
              </Item>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Plano e valor</h3>
            <div className="grid grid-cols-3 gap-4">
              <Item label="Plano">
                {data.plan ? `${data.plan.name} · ${data.plan.type.value}` : "-"}
              </Item>
              <Item label="Valor negociado">{formatBRL(data.amount)}</Item>
              <Item label="Quantidade">{String(data.qty)}</Item>
              <Item label="Vencimento">{data.dueDay ? `Dia ${data.dueDay}` : "-"}</Item>
              <Item label="Sistema">{data.system?.value ?? "-"}</Item>
              <Item label="Mailing">{data.mailing?.value ?? "-"}</Item>
              <Item label="Forma de pagamento">{data.paymentMethod?.value ?? "-"}</Item>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Operação e origem</h3>
            <div className="grid grid-cols-3 gap-4">
              <Item label="PDV">{data.pdv?.value ?? "-"}</Item>
              <Item label="Login">{data.login ?? "-"}</Item>
              <Item label="Vendedor">{data.seller.name}</Item>
              <Item label="Supervisor">{data.supervisor?.name ?? "-"}</Item>
              <Item label="BKO">{data.bko?.name ?? "-"}</Item>
              <Item label="Auditor">{data.auditor?.name ?? "-"}</Item>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Agendamento e instalação</h3>
            <div className="grid grid-cols-3 gap-4">
              <Item label="Data do agendamento">
                {data.scheduleDate ? formatDate(data.scheduleDate) : "-"}
              </Item>
              <Item label="Período">{data.schedulePeriod?.value ?? "-"}</Item>
              <Item label="Data da instalação">
                {data.installedAt ? formatDate(data.installedAt) : "-"}
              </Item>
              <Item label="BRScan">
                {data.brscan === null ? "-" : data.brscan ? "Aprovado" : "Não"}
              </Item>
              <Item label="Auditoria">{data.auditNote ?? "-"}</Item>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Observações</h3>
            <p className="text-body text-secondary">{data.notes ?? "-"}</p>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-h3 text-primary">Resumo</h3>
              <Badge status={saleStatusToBadge(data.status.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-caption text-muted">Valor total</span>
              <span className="text-display text-primary">{formatBRL(data.amount)}</span>
            </div>
            <Item label="Data da venda">{formatDate(data.date)}</Item>
            <Item label="Ordem de venda">{data.orderNumber ?? "-"}</Item>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Dados bancários</h3>
            <Item label="Banco">
              {data.bankCode ? `${data.bankCode} - ${data.bankName ?? ""}` : (data.bankName ?? "-")}
            </Item>
            <Item label="Agência">
              {data.bankAgency
                ? `${data.bankAgency}${data.bankAgencyDigit ? `-${data.bankAgencyDigit}` : ""}`
                : "-"}
            </Item>
            <Item label="Conta">
              {data.bankAccount
                ? `${data.bankAccount}${data.bankAccountDigit ? `-${data.bankAccountDigit}` : ""}`
                : "-"}
            </Item>
            <Item label="Tipo de conta">
              {data.bankAccountType === "CHECKING"
                ? "Corrente"
                : data.bankAccountType === "SAVINGS"
                  ? "Poupança"
                  : "-"}
            </Item>
            <Item label="Titular">
              {data.accountHolderIsCustomer === true
                ? "Próprio cliente"
                : data.accountHolderIsCustomer === false
                  ? `${data.accountHolderName ?? "-"} · CPF ${
                      data.accountHolderCpf ? formatDisplayCpfCnpj(data.accountHolderCpf) : "-"
                    }`
                  : "-"}
            </Item>
          </section>

          <SaleHistory saleId={saleId} />
          <SaleAttachments
            sale={data}
            canEdit={hasPermission(subject, "sales.edit")}
            canUpload={
              hasPermission(subject, "sales.edit") ||
              (hasPermission(subject, "sales.create") && data.seller.id === user?.id)
            }
          />
        </div>
      </div>
    </div>
  );
}

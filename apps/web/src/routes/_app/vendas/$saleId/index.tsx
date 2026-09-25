import { SaleActions } from "@/components/sales/sale-actions";
import { SaleAttachments } from "@/components/sales/sale-attachments";
import { SaleHistory } from "@/components/sales/sale-history";
import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import { Badge, Button, DetailItem } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePermission } from "@/hooks/use-permission";
import { useSale } from "@/hooks/use-sales";
import { APP_NAME } from "@/lib/brand";
import { formatBRL, formatDate } from "@/lib/format";
import { saleStatusToBadge } from "@/lib/sale-status";
import { formatCep, formatDisplayCpfCnpj, formatPhone } from "@comms-crm-core/validation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/vendas/$saleId/")({
  component: SaleDetailPage,
});

function SaleDetailPage() {
  const { saleId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const sale = useSale(saleId);
  const canEditSale = usePermission("sales.edit");
  const canChangeStatus = usePermission("sales.change_status");
  const canAudit = usePermission("sales.audit");
  const canChangeSellerPermission = usePermission("sales.change_seller");
  const canManageUsers = usePermission("users.manage");
  const canCreateSale = usePermission("sales.create");
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
  const canEdit = canEditSale && data.canceledAt === null;
  const canChangeSeller = canChangeSellerPermission && canManageUsers;
  const canUploadAttachment = canEditSale || (canCreateSale && data.seller.id === user?.id);

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
        canChangeStatus={canChangeStatus}
        canAudit={canAudit}
        canEdit={canEditSale}
        canChangeSeller={canChangeSeller}
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
              <DetailItem label="Nome / Razão social">{data.customer.name}</DetailItem>
              <DetailItem label="CPF/CNPJ">
                {data.customer.cpfCnpj ? formatDisplayCpfCnpj(data.customer.cpfCnpj) : "-"}
              </DetailItem>
              <DetailItem label="Data de nascimento">
                {data.customer.birthDate ? formatDate(data.customer.birthDate) : "-"}
              </DetailItem>
              <DetailItem label="Nome da mãe">{data.customer.motherName ?? "-"}</DetailItem>
              <DetailItem label="E-mail">{data.customer.email ?? "-"}</DetailItem>
              <DetailItem label="Contato 1">
                {data.customer.phone1 ? formatPhone(data.customer.phone1) : "-"}
              </DetailItem>
              <DetailItem label="Contato 2">
                {data.customer.phone2 ? formatPhone(data.customer.phone2) : "-"}
              </DetailItem>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Endereço da venda</h3>
            <div className="grid grid-cols-3 gap-4">
              <DetailItem label="CEP">
                {data.address?.postalCode ? formatCep(data.address.postalCode) : "-"}
              </DetailItem>
              <DetailItem label="Logradouro">{data.address?.street ?? "-"}</DetailItem>
              <DetailItem label="Número">
                {data.address?.noNumber ? "S/N" : (data.address?.number ?? "-")}
              </DetailItem>
              <DetailItem label="Complemento">{data.address?.complement ?? "-"}</DetailItem>
              <DetailItem label="Bairro">{data.address?.neighborhood ?? "-"}</DetailItem>
              <DetailItem label="Cidade / UF">
                {data.address?.city ?? "-"}
                {data.address?.state ? ` / ${data.address.state}` : ""}
              </DetailItem>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Plano e valor</h3>
            <div className="grid grid-cols-3 gap-4">
              <DetailItem label="Plano">
                {data.plan ? `${data.plan.name} · ${data.plan.type.value}` : "-"}
              </DetailItem>
              <DetailItem label="Valor negociado">{formatBRL(data.amount)}</DetailItem>
              <DetailItem label="Quantidade">{String(data.qty)}</DetailItem>
              <DetailItem label="Vencimento">{data.dueDay ? `Dia ${data.dueDay}` : "-"}</DetailItem>
              <DetailItem label="Sistema">{data.system?.value ?? "-"}</DetailItem>
              <DetailItem label="Mailing">{data.mailing?.value ?? "-"}</DetailItem>
              <DetailItem label="Forma de pagamento">{data.paymentMethod?.value ?? "-"}</DetailItem>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Operação e origem</h3>
            <div className="grid grid-cols-3 gap-4">
              <DetailItem label="PDV">{data.pdv?.value ?? "-"}</DetailItem>
              <DetailItem label="Matrícula (Login)">
                {data.seller.externalReference ?? "-"}
              </DetailItem>
              <DetailItem label="Vendedor">{data.seller.name}</DetailItem>
              <DetailItem label="Supervisor">{data.supervisor?.name ?? "-"}</DetailItem>
              <DetailItem label="BKO">{data.bko?.name ?? "-"}</DetailItem>
              <DetailItem label="Auditor">{data.auditor?.name ?? "-"}</DetailItem>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Agendamento e instalação</h3>
            <div className="grid grid-cols-3 gap-4">
              <DetailItem label="Data do agendamento">
                {data.scheduleDate ? formatDate(data.scheduleDate) : "-"}
              </DetailItem>
              <DetailItem label="Período">{data.schedulePeriod?.value ?? "-"}</DetailItem>
              <DetailItem label="Data da instalação">
                {data.installedAt ? formatDate(data.installedAt) : "-"}
              </DetailItem>
              <DetailItem label="BRScan">
                {data.brscan === null ? "-" : data.brscan ? "Aprovado" : "Não"}
              </DetailItem>
              <DetailItem label="Auditoria">{data.auditNote ?? "-"}</DetailItem>
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
            <DetailItem label="Data da venda">{formatDate(data.date)}</DetailItem>
            <DetailItem label="Ordem de venda">{data.orderNumber ?? "-"}</DetailItem>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Dados bancários</h3>
            <DetailItem label="Banco">
              {data.bankCode ? `${data.bankCode} - ${data.bankName ?? ""}` : (data.bankName ?? "-")}
            </DetailItem>
            <DetailItem label="Agência">
              {data.bankAgency
                ? `${data.bankAgency}${data.bankAgencyDigit ? `-${data.bankAgencyDigit}` : ""}`
                : "-"}
            </DetailItem>
            <DetailItem label="Conta">
              {data.bankAccount
                ? `${data.bankAccount}${data.bankAccountDigit ? `-${data.bankAccountDigit}` : ""}`
                : "-"}
            </DetailItem>
            <DetailItem label="Tipo de conta">
              {data.bankAccountType === "CHECKING"
                ? "Corrente"
                : data.bankAccountType === "SAVINGS"
                  ? "Poupança"
                  : "-"}
            </DetailItem>
            <DetailItem label="Titular">
              {data.accountHolderIsCustomer === true
                ? "Próprio cliente"
                : data.accountHolderIsCustomer === false
                  ? `${data.accountHolderName ?? "-"} · CPF ${
                      data.accountHolderCpf ? formatDisplayCpfCnpj(data.accountHolderCpf) : "-"
                    }`
                  : "-"}
            </DetailItem>
          </section>

          <SaleHistory saleId={saleId} />
          <SaleAttachments sale={data} canEdit={canEditSale} canUpload={canUploadAttachment} />
        </div>
      </div>
    </div>
  );
}

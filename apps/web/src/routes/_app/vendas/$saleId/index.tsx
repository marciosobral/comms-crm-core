import { SaleActions } from "@/components/sales/sale-actions";
import { SaleAttachments } from "@/components/sales/sale-attachments";
import { SaleHistory } from "@/components/sales/sale-history";
import { Badge } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSale } from "@/hooks/use-sales";
import { formatBRL, formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { saleStatusToBadge } from "@/lib/sale-status";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { usePageMeta } from "../../../_app";

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
  usePageMeta({ title: "Detalhe da Venda", breadcrumb: ["CRM", "Vendas", "Detalhe"] });
  const { user } = useCurrentUser();
  const sale = useSale(saleId);

  if (!sale.data) {
    return (
      <p className="text-body text-secondary">
        {sale.isError ? "Venda não encontrada ou sem acesso." : "Carregando..."}
      </p>
    );
  }
  const data = sale.data;
  const subject = user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h2 className="text-display text-primary">{data.customer.name}</h2>
            <Badge status={saleStatusToBadge(data.status.value)} />
          </div>
          <span className="text-body text-secondary">
            {formatBRL(data.amount)} · {formatDate(data.date)} · Vendedor: {data.seller.name}
          </span>
        </div>
        <SaleActions
          sale={data}
          canEdit={hasPermission(subject, "sales.edit")}
          canChangeStatus={hasPermission(subject, "sales.change_status")}
          canChangeSeller={
            hasPermission(subject, "sales.change_seller") && hasPermission(subject, "users.manage")
          }
        />
      </div>

      {data.canceledAt ? (
        <div className="rounded-lg border border-danger-border bg-danger-subtle p-4">
          <p className="text-body text-danger">
            Cancelada em {formatDate(data.canceledAt)} por {data.canceledBy?.name ?? "—"} —{" "}
            {data.cancelReason}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
          <h3 className="text-h3 text-primary">Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <Item label="Nome">{data.customer.name}</Item>
            <Item label="CPF/CNPJ">{data.customer.cpfCnpj}</Item>
            <Item label="Nascimento">
              {data.customer.birthDate ? formatDate(data.customer.birthDate) : "—"}
            </Item>
            <Item label="Nome da mãe">{data.customer.motherName ?? "—"}</Item>
            <Item label="Contato 1">{data.customer.phone1 ?? "—"}</Item>
            <Item label="Contato 2">{data.customer.phone2 ?? "—"}</Item>
            <Item label="E-mail">{data.customer.email ?? "—"}</Item>
            <Item label="Endereço">{data.customer.address ?? "—"}</Item>
            <Item label="Cidade/UF">
              {data.customer.city ?? "—"}
              {data.customer.state ? `/${data.customer.state}` : ""}
            </Item>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
          <h3 className="text-h3 text-primary">Plano e valor</h3>
          <div className="grid grid-cols-2 gap-4">
            <Item label="Plano internet">{data.internetPlan?.name ?? "—"}</Item>
            <Item label="Plano fixo">{data.fixedPlan?.name ?? "—"}</Item>
            <Item label="Valor negociado">{formatBRL(data.amount)}</Item>
            <Item label="Quantidade">{String(data.qty)}</Item>
            <Item label="Vencimento">{data.dueDay ? `Dia ${data.dueDay}` : "—"}</Item>
            <Item label="Data da venda">{formatDate(data.date)}</Item>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
          <h3 className="text-h3 text-primary">Operação e origem</h3>
          <div className="grid grid-cols-2 gap-4">
            <Item label="PDV">{data.pdv?.value ?? "—"}</Item>
            <Item label="Login">{data.login ?? "—"}</Item>
            <Item label="Sistema">{data.system?.value ?? "—"}</Item>
            <Item label="Mailing">{data.mailing?.value ?? "—"}</Item>
            <Item label="Ordem de venda">{data.orderNumber ?? "—"}</Item>
            <Item label="Supervisor">{data.supervisor?.name ?? "—"}</Item>
            <Item label="BKO">{data.bko?.name ?? "—"}</Item>
            <Item label="Auditor">{data.auditor?.name ?? "—"}</Item>
            <Item label="BRScan">{data.brscan === null ? "—" : data.brscan ? "Sim" : "Não"}</Item>
            <Item label="Observações">{data.notes ?? "—"}</Item>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
          <h3 className="text-h3 text-primary">Pagamento e instalação</h3>
          <div className="grid grid-cols-2 gap-4">
            <Item label="Forma de pagamento">{data.paymentMethod?.value ?? "—"}</Item>
            <Item label="Banco">{data.bankName ?? "—"}</Item>
            <Item label="Agência">{data.bankAgency ?? "—"}</Item>
            <Item label="Conta">{data.bankAccount ?? "—"}</Item>
            <Item label="Agendamento">
              {data.scheduleStart ? formatDate(data.scheduleStart) : "—"}
            </Item>
            <Item label="Instalação">{data.installedAt ? formatDate(data.installedAt) : "—"}</Item>
          </div>
        </section>
      </div>

      <SaleAttachments sale={data} canEdit={hasPermission(subject, "sales.edit")} />
      <SaleHistory saleId={saleId} />
    </div>
  );
}

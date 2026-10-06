import { Badge, CardItem, CardList, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { saleStatusToBadge } from "@/lib/sale-status";
import type { SaleRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type SaleDateBy, formatDisplayCpfCnpj } from "@comms-crm-core/validation";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SalesTable({
  sales,
  bare = false,
  footer,
  emphasizeCustomerName = false,
  dateBy = "sale",
}: {
  sales: SaleRow[];
  bare?: boolean;
  footer?: ReactNode;
  emphasizeCustomerName?: boolean;
  dateBy?: SaleDateBy;
}) {
  const navigate = useNavigate();
  const shownDate = (sale: SaleRow) =>
    formatDate(dateBy === "installation" ? (sale.installedAt ?? sale.date) : sale.date);

  const goToSale = (saleId: string) => navigate({ to: "/vendas/$saleId", params: { saleId } });

  return (
    <>
      <Table bare={bare} footer={footer} className="hidden sm:block">
        <colgroup>
          <col className="w-[18%] lg:w-[13%]" />
          <col className="w-[26%] lg:w-[22%]" />
          <col className="hidden w-[12%] lg:table-column" />
          <col className="w-[20%] lg:w-[11%]" />
          <col className="hidden w-[15%] lg:table-column" />
          <col className="w-[18%] lg:w-[16%]" />
          <col className="w-[18%] lg:w-[11%]" />
        </colgroup>
        <THead>
          <tr>
            <TH>Ordem</TH>
            <TH>Cliente</TH>
            <TH className="hidden lg:table-cell">Plano</TH>
            <TH align="right">Valor</TH>
            <TH className="hidden lg:table-cell">Vendedor</TH>
            <TH>Status</TH>
            <TH>{dateBy === "installation" ? "Instalação" : "Data"}</TH>
          </tr>
        </THead>
        <TBody>
          {sales.map((sale) => (
            <TR key={sale.id} onClick={() => goToSale(sale.id)}>
              <TD emphasis>{sale.orderNumber ?? "-"}</TD>
              <TD truncate={false} className="max-w-0 py-2">
                <span
                  className={cn(
                    "block truncate",
                    emphasizeCustomerName ? "text-primary" : "text-secondary",
                  )}
                  title={sale.customer.name}
                >
                  {sale.customer.name}
                </span>
                <span className="block truncate text-caption text-muted">
                  {sale.customer.cpfCnpj ? formatDisplayCpfCnpj(sale.customer.cpfCnpj) : "-"}
                </span>
              </TD>
              <TD className="hidden lg:table-cell">{sale.plan?.name ?? "-"}</TD>
              <TD align="right" emphasis>
                {formatBRL(sale.amount)}
              </TD>
              <TD className="hidden lg:table-cell">{sale.seller.name}</TD>
              <TD truncate={false}>
                <Badge status={saleStatusToBadge(sale.status.value)} label={sale.status.value} />
              </TD>
              <TD>{shownDate(sale)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <CardList footer={footer}>
        {sales.map((sale) => (
          <CardItem key={sale.id} onClick={() => goToSale(sale.id)}>
            <span className="flex items-center justify-between gap-3">
              <span className="text-small text-muted">{sale.orderNumber ?? "-"}</span>
              <Badge status={saleStatusToBadge(sale.status.value)} label={sale.status.value} />
            </span>
            <span
              className={cn(
                "text-body-medium",
                emphasizeCustomerName ? "text-primary" : "text-secondary",
              )}
            >
              {sale.customer.name}
            </span>
            <span className="text-caption text-muted">
              {sale.customer.cpfCnpj ? formatDisplayCpfCnpj(sale.customer.cpfCnpj) : "-"}
            </span>
            <span className="flex items-center justify-between gap-3 text-small text-secondary">
              <span className="min-w-0 truncate">{sale.plan?.name ?? "-"}</span>
              <span className="shrink-0 text-primary">{formatBRL(sale.amount)}</span>
            </span>
            <span className="text-caption text-muted">
              {sale.seller.name} · {shownDate(sale)}
            </span>
          </CardItem>
        ))}
      </CardList>
    </>
  );
}

import { Badge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { saleStatusToBadge } from "@/lib/sale-status";
import type { SaleRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDisplayCpfCnpj } from "@comms-crm-core/validation";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SalesTable({
  sales,
  bare = false,
  footer,
  emphasizeCustomerName = false,
}: {
  sales: SaleRow[];
  bare?: boolean;
  footer?: ReactNode;
  emphasizeCustomerName?: boolean;
}) {
  const navigate = useNavigate();

  const goToSale = (saleId: string) => navigate({ to: "/vendas/$saleId", params: { saleId } });

  return (
    <Table bare={bare} footer={footer}>
      <colgroup>
        <col style={{ width: "13%" }} />
        <col style={{ width: "22%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "11%" }} />
      </colgroup>
      <THead>
        <tr>
          <TH>Ordem</TH>
          <TH>Cliente</TH>
          <TH>Plano</TH>
          <TH align="right">Valor</TH>
          <TH>Vendedor</TH>
          <TH>Status</TH>
          <TH>Data</TH>
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
            <TD>{sale.plan?.name ?? "-"}</TD>
            <TD align="right" emphasis>
              {formatBRL(sale.amount)}
            </TD>
            <TD>{sale.seller.name}</TD>
            <TD truncate={false}>
              <Badge status={saleStatusToBadge(sale.status.value)} />
            </TD>
            <TD>{formatDate(sale.date)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

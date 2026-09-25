import {
  ActionMenu,
  ActionMenuItem,
  Badge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { useRowMenu } from "@/hooks/use-row-menu";
import { formatBRL, formatDate } from "@/lib/format";
import { saleStatusToBadge } from "@/lib/sale-status";
import type { SaleRow } from "@/lib/types";
import { formatDisplayCpfCnpj } from "@comms-crm-core/validation";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SalesTable({
  sales,
  bare = false,
  footer,
  clickableRows = false,
  emphasizeCustomerName = false,
}: {
  sales: SaleRow[];
  bare?: boolean;
  footer?: ReactNode;
  clickableRows?: boolean;
  emphasizeCustomerName?: boolean;
}) {
  const navigate = useNavigate();
  const rowMenu = useRowMenu();

  const goToSale = (saleId: string) => navigate({ to: "/vendas/$saleId", params: { saleId } });

  return (
    <Table bare={bare} footer={footer}>
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
          <TR key={sale.id} onClick={clickableRows ? () => goToSale(sale.id) : undefined}>
            <TD emphasis>{sale.orderNumber ?? "-"}</TD>
            <TD emphasis={emphasizeCustomerName}>{sale.customer.name}</TD>
            <TD>{sale.customer.cpfCnpj ? formatDisplayCpfCnpj(sale.customer.cpfCnpj) : "-"}</TD>
            <TD>{sale.plan?.name ?? "-"}</TD>
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
                open={rowMenu.isOpen(sale.id)}
                onOpenChange={rowMenu.onOpenChange(sale.id)}
              >
                <ActionMenuItem
                  onClick={() => {
                    rowMenu.close();
                    goToSale(sale.id);
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
  );
}

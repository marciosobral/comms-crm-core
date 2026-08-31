import { SaleForm } from "@/components/sales/sale-form";
import { usePageMeta } from "@/components/shell/page-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/vendas/nova")({
  component: NewSalePage,
});

function NewSalePage() {
  usePageMeta({ title: "Nova Venda", breadcrumb: ["CRM", "Vendas", "Nova venda"] });
  const navigate = useNavigate();

  return (
    <SaleForm
      mode="create"
      onDone={(saleId) =>
        saleId
          ? navigate({ to: "/vendas/$saleId", params: { saleId } })
          : navigate({ to: "/vendas" })
      }
    />
  );
}

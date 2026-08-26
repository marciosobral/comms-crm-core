import { SaleForm } from "@/components/sales/sale-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { usePageMeta } from "../../_app";

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

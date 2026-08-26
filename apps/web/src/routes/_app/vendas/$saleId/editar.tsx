import { SaleForm } from "@/components/sales/sale-form";
import { useSale } from "@/hooks/use-sales";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { usePageMeta } from "../../../_app";

export const Route = createFileRoute("/_app/vendas/$saleId/editar")({
  component: EditSalePage,
});

function EditSalePage() {
  const { saleId } = Route.useParams();
  usePageMeta({ title: "Editar Venda", breadcrumb: ["CRM", "Vendas", "Editar"] });
  const navigate = useNavigate();
  const sale = useSale(saleId);

  if (!sale.data) {
    return <p className="text-body text-secondary">Carregando...</p>;
  }

  return (
    <SaleForm
      mode="edit"
      sale={sale.data}
      onDone={() => navigate({ to: "/vendas/$saleId", params: { saleId } })}
    />
  );
}

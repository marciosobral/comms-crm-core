import { formatBRL } from "@/lib/format";

export function SaleSummary({
  amount,
  dueDay,
  paymentLabel,
  sellerName,
  priceMin,
  priceMax,
}: {
  amount: number;
  dueDay: string;
  paymentLabel: string | null;
  sellerName: string | null;
  priceMin: number | null;
  priceMax: number | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Resumo da venda</h3>
      <div className="grid grid-cols-2 gap-4 text-body">
        <span className="text-secondary">Valor negociado</span>
        <span className="text-primary">{amount ? formatBRL(amount) : "—"}</span>
        <span className="text-secondary">Vencimento</span>
        <span className="text-primary">{dueDay ? `Dia ${dueDay}` : "—"}</span>
        <span className="text-secondary">Forma de pagamento</span>
        <span className="text-primary">{paymentLabel ?? "—"}</span>
        <span className="text-secondary">Vendedor</span>
        <span className="text-primary">{sellerName ?? "—"}</span>
      </div>
      {priceMin !== null && priceMax !== null ? (
        <p className="border-t border-subtle pt-4 text-caption text-muted">
          Dentro da faixa do plano: {formatBRL(priceMin)} a {formatBRL(priceMax)}.
        </p>
      ) : null}
    </div>
  );
}

import { useSaleHistory } from "@/hooks/use-sales";
import { formatDate } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Alteração",
  DELETE: "Remoção",
};

const DIFF_LABELS: Record<string, string> = {
  statusId: "Status",
  sellerId: "Vendedor",
  amount: "Valor",
  pdvId: "PDV",
  cancelReason: "Motivo do cancelamento",
};

export function SaleHistory({ saleId }: { saleId: string }) {
  const history = useSaleHistory(saleId);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Histórico</h3>
      {(history.data ?? []).length === 0 ? (
        <p className="text-body text-secondary">Nenhum evento registrado.</p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {(history.data ?? []).map((entry) => (
          <li key={entry.id} className="border-l-2 border-default pl-4">
            <div className="flex items-baseline gap-3">
              <span className="text-body-medium text-primary">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="text-caption text-muted">
                {entry.user?.name ?? "Sistema"} · {formatDate(entry.createdAt)}
              </span>
            </div>
            {entry.diff ? (
              <ul className="mt-1 flex flex-col gap-1">
                {Object.entries(entry.diff).map(([key, change]) => (
                  <li key={key} className="text-small text-secondary">
                    {DIFF_LABELS[key] ?? key}: {String(change.from ?? "—")} →{" "}
                    {String(change.to ?? "—")}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

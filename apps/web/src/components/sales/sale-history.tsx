import { useSaleHistory } from "@/hooks/use-sales";
import { formatBRL, formatDate } from "@/lib/format";

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
  auditNote: "Auditoria",
  brscan: "BRScan",
};

const MONETARY_FIELDS = new Set(["amount"]);

function formatDiffValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Aprovado" : "Não";
  if (MONETARY_FIELDS.has(field)) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return formatBRL(numeric);
  }
  return String(value);
}

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
          <li key={entry.id} className="flex gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-body-medium text-primary">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="text-caption text-muted">
                {entry.user?.name ?? "Sistema"} · {formatDate(entry.createdAt)}
              </span>
              {entry.diff ? (
                <ul className="mt-1 flex flex-col gap-1">
                  {Object.entries(entry.diff).map(([key, change]) => (
                    <li key={key} className="text-small text-secondary">
                      {DIFF_LABELS[key] ?? key}: {formatDiffValue(key, change.from)} →{" "}
                      {formatDiffValue(key, change.to)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

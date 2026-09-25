import { formatDate } from "@/lib/format";
import { ACTION_LABELS, historyChanges } from "@/lib/history-format";
import type { SaleHistoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export function HistoryTimeline({ entries }: { entries: SaleHistoryEntry[] }) {
  const visibleEntries = entries
    .map((entry) => ({ entry, changes: historyChanges(entry.diff) }))
    .filter(({ entry, changes }) => entry.action !== "UPDATE" || changes.length > 0);

  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();
  const countLabel = visibleEntries.length === 1 ? "1 evento" : `${visibleEntries.length} eventos`;

  return (
    <section className="flex flex-col rounded-lg border border-default bg-surface">
      <h3 className="text-h3 text-primary">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 rounded-lg p-6 text-left hover:bg-surface-hover"
        >
          <span className="flex items-baseline gap-2">
            Histórico
            <span className="text-caption text-muted">{countLabel}</span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden
            className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-180")}
          />
        </button>
      </h3>
      {isOpen ? (
        <div id={contentId} className="max-h-[28rem] overflow-y-auto px-6 pb-6">
          {visibleEntries.length === 0 ? (
            <p className="text-body text-secondary">Nenhum evento registrado.</p>
          ) : null}
          <ul className="flex flex-col gap-4">
            {visibleEntries.map(({ entry, changes }) => (
              <li key={entry.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body-medium text-primary">
                    {ACTION_LABELS[entry.action]}
                  </span>
                  <span className="text-caption text-muted">
                    {entry.user?.name ?? "Sistema"} · {formatDate(entry.createdAt)}
                  </span>
                  {changes.length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-1">
                      {changes.map((change) => (
                        <li key={change.field} className="break-words text-small text-secondary">
                          {change.label}: {change.from} → {change.to}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

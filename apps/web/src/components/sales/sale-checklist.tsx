import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <li className="flex items-center gap-3 text-body text-primary">
      <span
        className={cn(
          "flex h-4.5 w-4.5 items-center justify-center rounded-sm border",
          checked ? "border-accent bg-accent text-on-accent" : "border-strong bg-base",
        )}
        aria-hidden
      >
        {checked ? <Check size={12} /> : null}
      </span>
      {label}
    </li>
  );
}

export function SaleChecklist({ bankDataConfirmed }: { bankDataConfirmed: boolean }) {
  const items = [
    { label: "Áudio da venda anexado", checked: false },
    { label: "Dados bancários conferidos", checked: bankDataConfirmed },
    { label: "Comprovante de endereço anexado", checked: false },
  ];
  const doneCount = items.filter((item) => item.checked).length;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Antes de salvar</h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <ChecklistItem key={item.label} label={item.label} checked={item.checked} />
        ))}
      </ul>
      <p className="text-caption text-muted">
        {doneCount} de {items.length} concluídos - pendências não bloqueiam.
      </p>
    </div>
  );
}

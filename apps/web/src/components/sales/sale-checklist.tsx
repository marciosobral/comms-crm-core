import { Checkbox } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <li className="flex items-center gap-3 text-body text-primary">
      <span
        className={cn(
          "flex h-[18px] w-[18px] items-center justify-center rounded-sm border",
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

export function SaleChecklist({
  brscan,
  onBrscanChange,
  bankDataConfirmed,
}: {
  brscan: boolean;
  onBrscanChange: (value: boolean) => void;
  bankDataConfirmed: boolean;
}) {
  const items = [
    { label: "Áudio da venda anexado", checked: false },
    { label: "Dados bancários conferidos", checked: bankDataConfirmed },
    { label: "Comprovante de endereço anexado", checked: false },
  ];
  const doneCount = items.filter((item) => item.checked).length + (brscan ? 1 : 0);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Antes de salvar</h3>
      <ul className="flex flex-col gap-3">
        <li>
          <Checkbox checked={brscan} onChange={onBrscanChange} label="CPF validado no BRScan" />
        </li>
        {items.map((item) => (
          <ChecklistItem key={item.label} label={item.label} checked={item.checked} />
        ))}
      </ul>
      <p className="text-caption text-muted">
        {doneCount} de {items.length + 1} concluídos - pendências não bloqueiam.
      </p>
    </div>
  );
}

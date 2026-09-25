import { Badge, Button } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { Copy } from "lucide-react";
import { useState } from "react";

export function PlanPanel({ plan }: { plan: Plan | null }) {
  const [copied, setCopied] = useState(false);

  if (!plan) {
    return (
      <div className="rounded-lg border border-default bg-surface p-6">
        <p className="text-body text-secondary">Selecione um plano para ver o resumo.</p>
      </div>
    );
  }

  const onCopy = async () => {
    if (!plan.salesScript) return;
    await navigator.clipboard.writeText(plan.salesScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-h3 text-primary">{plan.name}</h3>
          <Badge status={plan.active ? "ativo" : "inativo"} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-body">
          <span className="text-secondary">Tipo</span>
          <span className="text-primary">{plan.type.value}</span>
          <span className="text-secondary">Velocidade</span>
          <span className="text-primary">{plan.speed ?? "-"}</span>
          <span className="text-secondary">Preço base</span>
          <span className="text-primary">{formatBRL(plan.basePrice)}</span>
          <span className="text-secondary">Preço mínimo</span>
          <span className="text-primary">{formatBRL(plan.minPrice)}</span>
        </div>
        {plan.features.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-subtle pt-4">
            <span className="text-eyebrow uppercase tracking-wide text-muted">
              O que está incluso
            </span>
            <ul className="flex flex-col gap-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-small text-secondary">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-secondary" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {plan.salesScript ? (
        <div className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-h3 text-primary">Script de venda</h3>
            <Button variant="secondary" icon={Copy} onClick={onCopy}>
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-body text-secondary">{plan.salesScript}</p>
        </div>
      ) : null}
    </div>
  );
}

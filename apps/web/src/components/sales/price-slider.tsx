import { MaskedInput } from "@/components/ui";
import { formatBRL, formatMoneyInput, parsePrice } from "@/lib/format";
import { useId, useState } from "react";

export function PriceSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
}) {
  const id = useId();
  const numberId = useId();
  const clamp = (n: number) => Math.min(Math.max(n, min), max);
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={numberId} className="text-small text-secondary">
          Valor negociado
        </label>
        <MaskedInput
          id={numberId}
          mask="money"
          inputMode="decimal"
          placeholder="0,00"
          value={draft ?? formatMoneyInput(value)}
          onChange={(next) => {
            setDraft(next);
            const parsed = parsePrice(next);
            if (Number.isFinite(parsed)) onChange(parsed);
          }}
          onFocus={() => setDraft(formatMoneyInput(value))}
          onBlur={() => {
            const parsed = parsePrice(draft ?? "");
            setDraft(null);
            onChange(clamp(Number.isFinite(parsed) ? parsed : value));
          }}
          className="w-40 text-right"
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={clamp(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Valor negociado"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-accent"
      />
      <div className="flex justify-between text-caption text-muted">
        <span>{formatBRL(min)} (mínimo)</span>
        <span>{formatBRL(max)} (máximo)</span>
      </div>
    </div>
  );
}

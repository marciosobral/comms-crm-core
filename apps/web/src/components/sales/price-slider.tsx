import { formatBRL } from "@/lib/format";
import { useId } from "react";

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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={numberId} className="text-small text-secondary">
          Valor negociado
        </label>
        <input
          id={numberId}
          type="number"
          step="0.01"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={(e) => onChange(clamp(Number(e.target.value)))}
          className="h-10 w-32 rounded-md border border-default bg-base px-3 text-right text-body text-primary focus:border-accent focus:outline-none"
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

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-3 text-body text-primary">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex h-[18px] w-[18px] items-center justify-center rounded-sm border transition-colors disabled:opacity-50",
          checked ? "border-accent bg-accent text-on-accent" : "border-strong bg-base",
        )}
      >
        {checked ? <Check size={12} aria-hidden /> : null}
      </button>
      {label}
    </label>
  );
}

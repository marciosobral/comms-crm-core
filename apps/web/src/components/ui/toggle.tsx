import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-accent" : "bg-elevated border border-strong",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-4 w-4 rounded-full transition-transform",
          checked ? "left-1 translate-x-5 bg-on-accent" : "left-1 bg-muted",
        )}
      />
    </button>
  );
}

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed",
  secondary: "bg-elevated text-primary border border-default hover:bg-surface-hover",
  ghost: "bg-transparent text-secondary border border-strong hover:bg-surface-hover",
  danger: "bg-danger-subtle text-danger border border-danger-border hover:bg-danger-subtle/80",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  icon: Icon,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-body-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon size={16} aria-hidden /> : null}
      {loading ? "Carregando..." : children}
    </button>
  );
}

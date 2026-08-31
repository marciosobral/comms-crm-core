import { cn } from "@/lib/utils";

export type BadgeStatus =
  | "gross"
  | "agInstalacao"
  | "agBiometria"
  | "cancelada"
  | "ativo"
  | "inativo"
  | "venda"
  | "vencimento";

const STATUS_STYLES: Record<BadgeStatus, string> = {
  gross: "bg-success-subtle border-success-border text-success",
  agInstalacao: "bg-warning-subtle border-warning-border text-warning",
  agBiometria: "bg-info-subtle border-info-border text-info",
  cancelada: "bg-danger-subtle border-danger-border text-danger",
  ativo: "bg-success-subtle border-success-border text-success",
  inativo: "bg-elevated border-default text-muted",
  venda: "bg-accent-subtle border-accent-border text-accent",
  vencimento: "bg-warning-subtle border-warning-border text-warning",
};

const STATUS_LABELS: Record<BadgeStatus, string> = {
  gross: "GROSS",
  agInstalacao: "AG. INSTALAÇÃO",
  agBiometria: "AG. BIOMETRIA",
  cancelada: "CANCELADA",
  ativo: "Ativo",
  inativo: "Inativo",
  venda: "VENDA",
  vencimento: "VENCIMENTO",
};

export function Badge({
  status,
  label,
  className,
}: { status: BadgeStatus; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-3 text-eyebrow",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}

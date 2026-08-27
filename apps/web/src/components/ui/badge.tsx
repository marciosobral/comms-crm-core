import { cn } from "@/lib/utils";

export type BadgeStatus =
  | "gross"
  | "agInstalacao"
  | "agBiometria"
  | "cancelada"
  | "ativo"
  | "inativo";

const STATUS_STYLES: Record<BadgeStatus, string> = {
  gross: "bg-success-subtle border-success-border text-success",
  agInstalacao: "bg-warning-subtle border-warning-border text-warning",
  agBiometria: "bg-info-subtle border-info-border text-info",
  cancelada: "bg-danger-subtle border-danger-border text-danger",
  ativo: "bg-success-subtle border-success-border text-success",
  inativo: "bg-elevated border-default text-muted",
};

const STATUS_LABELS: Record<BadgeStatus, string> = {
  gross: "GROSS",
  agInstalacao: "AG. INSTALAÇÃO",
  agBiometria: "AG. BIOMETRIA",
  cancelada: "CANCELADA",
  ativo: "Ativo",
  inativo: "Inativo",
};

export function Badge({
  status,
  label,
  className,
}: { status: BadgeStatus; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-3 text-eyebrow",
        STATUS_STYLES[status],
        className,
      )}
    >
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "default",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const large = size === "lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "max-w-full rounded-lg border border-default bg-elevated p-6",
          large ? "flex max-h-[calc(100vh-3rem)] w-[720px] flex-col" : "w-[480px]",
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-6 flex shrink-0 items-center justify-between">
          <h2 className="text-h3 text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted hover:text-primary"
          >
            <X size={16} />
          </button>
        </div>
        <div className={cn("flex flex-col gap-4", large && "min-h-0 flex-1 overflow-hidden")}>
          {children}
        </div>
        {footer ? <div className="mt-6 flex shrink-0 justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}

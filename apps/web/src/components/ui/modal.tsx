import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

type ModalSize = "sm" | "default" | "lg";

const OVERLAY: Record<ModalSize, string> = {
  sm: "items-center p-4 sm:p-6",
  default: "items-stretch sm:items-center sm:p-6",
  lg: "items-stretch sm:items-center sm:p-6",
};

const PANEL: Record<ModalSize, string> = {
  sm: "w-120 rounded-lg border p-6",
  default: "h-dvh w-full p-4 sm:h-auto sm:w-120 sm:rounded-lg sm:border sm:p-6",
  lg: "h-dvh w-full p-4 sm:h-auto sm:max-h-[calc(100vh-3rem)] sm:w-180 sm:rounded-lg sm:border sm:p-6",
};

const BODY: Record<ModalSize, string> = {
  sm: "",
  default: "min-h-0 flex-1 overflow-y-auto sm:flex-none sm:overflow-visible",
  lg: "min-h-0 flex-1 overflow-y-auto sm:overflow-hidden",
};

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
  size?: ModalSize;
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

  return (
    <div
      className={cn("fixed inset-0 z-50 flex justify-center bg-overlay", OVERLAY[size])}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn("flex max-w-full flex-col border-default bg-elevated", PANEL[size])}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-6 flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-h3 text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-m-3 p-3 text-muted hover:text-primary sm:m-0 sm:p-0"
          >
            <X size={16} />
          </button>
        </div>
        <div className={cn("flex flex-col gap-4", BODY[size])}>{children}</div>
        {footer ? (
          <div className="mt-6 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function CardList({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:hidden", className)}>
      {children}
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">{footer}</div>
      ) : null}
    </div>
  );
}

export function CardItem({
  children,
  onClick,
  actions,
}: {
  children: ReactNode;
  onClick?: () => void;
  actions?: ReactNode;
}) {
  const content = cn("flex w-full flex-col gap-1 p-4 text-left", actions ? "pr-12" : undefined);
  return (
    <div className="relative rounded-lg border border-default bg-surface">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(content, "rounded-lg active:bg-surface-hover")}
        >
          {children}
        </button>
      ) : (
        <div className={content}>{children}</div>
      )}
      {actions ? <div className="absolute right-3 top-3">{actions}</div> : null}
    </div>
  );
}

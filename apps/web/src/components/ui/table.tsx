import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode, ThHTMLAttributes } from "react";

export function Table({
  children,
  footer,
  bare = false,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  bare?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        bare ? undefined : "overflow-hidden rounded-lg border border-default bg-surface",
        className,
      )}
    >
      <table className="w-full table-fixed border-collapse">{children}</table>
      {footer ? (
        <div
          className={cn(
            "flex items-center justify-between px-6 py-4",
            bare ? "pt-4" : "border-t border-subtle",
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-hover">{children}</thead>;
}

type THProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> & {
  align?: "left" | "right";
};

export function TH({ children, align = "left", className, ...props }: THProps) {
  return (
    <th
      className={cn(
        "h-8 px-4 text-eyebrow uppercase tracking-wide text-muted",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  onClick,
  className,
  onKeyDown,
  tabIndex,
  ...props
}: ComponentProps<"tr">) {
  return (
    <tr
      onClick={onClick}
      onKeyDown={
        onKeyDown ??
        (onClick
          ? (e) => {
              if (e.key === "Enter") e.currentTarget.click();
            }
          : undefined)
      }
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      className={cn(
        "border-t border-subtle hover:bg-surface-hover",
        onClick ? "cursor-pointer" : undefined,
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "left",
  emphasis = false,
  truncate = true,
  className,
}: {
  children: ReactNode;
  align?: "left" | "right";
  emphasis?: boolean;
  truncate?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "h-10 px-4 text-small",
        truncate ? "max-w-0 truncate" : undefined,
        emphasis ? "text-primary" : "text-secondary",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      title={truncate && typeof children === "string" ? children : undefined}
    >
      {children}
    </td>
  );
}

import { cn } from "@/lib/utils";
import type { ReactNode, ThHTMLAttributes } from "react";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-default bg-surface", className)}>
      <table className="w-full table-fixed border-collapse">{children}</table>
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

export function TR({ children }: { children: ReactNode }) {
  return <tr className="border-t border-subtle hover:bg-surface-hover">{children}</tr>;
}

export function TD({
  children,
  align = "left",
  emphasis = false,
  className,
}: {
  children: ReactNode;
  align?: "left" | "right";
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "h-10 truncate px-4 text-small",
        emphasis ? "text-primary" : "text-secondary",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}

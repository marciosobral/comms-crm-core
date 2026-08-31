import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export function TrendChip({
  direction,
  children,
}: {
  direction: "up" | "down";
  children: ReactNode;
}) {
  const Icon = direction === "up" ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-caption",
        direction === "up" ? "text-success" : "text-danger",
      )}
    >
      <Icon size={12} aria-hidden />
      {children}
    </span>
  );
}

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

const CONTROL_BASE =
  "w-full rounded-md border border-default bg-base px-3 text-body text-primary placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50";

export { CONTROL_BASE };

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_BASE, "h-10", className)} {...props} />;
}

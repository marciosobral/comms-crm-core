import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";
import { CONTROL_BASE } from "./input";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL_BASE, "min-h-24 py-2", className)} {...props} />;
}

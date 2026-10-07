import { cn } from "@/lib/utils";
import { parseDateText } from "@comms-crm-core/validation";
import type { ClipboardEvent, InputHTMLAttributes } from "react";

const CONTROL_BASE =
  "w-full rounded-md border border-default bg-base px-3 text-[1rem] sm:text-body text-primary placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50";

export { CONTROL_BASE };

// Native date inputs ignore pasted text such as "15/03/1990". The value is written through the
// native setter and an input event so React (and react-hook-form) see it as a regular change.
function pasteDate(event: ClipboardEvent<HTMLInputElement>): void {
  const dateKey = parseDateText(event.clipboardData.getData("text"));
  if (!dateKey) return;
  event.preventDefault();
  const input = event.currentTarget;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, dateKey);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export function Input({ className, onPaste, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(CONTROL_BASE, "h-10", className)}
      onPaste={(event) => {
        if (props.type === "date") pasteDate(event);
        onPaste?.(event);
      }}
      {...props}
    />
  );
}

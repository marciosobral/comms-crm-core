import { CONTROL_BASE } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Paperclip, X } from "lucide-react";
import { useRef } from "react";

export function FilePicker({
  id,
  accept,
  file,
  onChange,
}: {
  id: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);

  return (
    <div className="relative">
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="peer sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className={cn(
          CONTROL_BASE,
          "flex h-10 cursor-pointer items-center gap-2 pr-10 peer-focus-visible:border-accent",
        )}
      >
        <Paperclip className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className={cn("truncate", file ? "text-primary" : "text-muted")}>
          {file ? file.name : "Escolher arquivo"}
        </span>
      </label>
      {file ? (
        <button
          type="button"
          aria-label="Remover arquivo"
          className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted hover:text-primary"
          onClick={() => {
            if (input.current) input.current.value = "";
            onChange(null);
          }}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

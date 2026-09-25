import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <label htmlFor={htmlFor} className="text-small text-secondary">
          {label}
        </label>
        {optional ? <span className="text-caption text-muted">Opcional</span> : null}
      </div>
      {children}
      {error ? <span className="text-caption text-danger">{error}</span> : null}
    </div>
  );
}

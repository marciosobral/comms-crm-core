import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-small text-secondary">
        {label}
      </label>
      {children}
      {error ? <span className="text-caption text-danger">{error}</span> : null}
    </div>
  );
}

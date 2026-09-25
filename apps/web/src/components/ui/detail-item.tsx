import type { ReactNode } from "react";

export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-muted">{label}</span>
      <span className="text-body text-primary">{children}</span>
    </div>
  );
}

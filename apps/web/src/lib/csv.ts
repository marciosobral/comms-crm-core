import { csvField } from "@comms-crm-core/validation";

function quoted(cell: string): string {
  return `"${csvField(cell).replaceAll('"', '""')}"`;
}

export function toCsvBlob(headers: string[], rows: string[][]): Blob {
  const csv = [headers, ...rows].map((line) => line.map(quoted).join(";")).join("\n");
  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

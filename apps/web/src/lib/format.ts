export function formatBRL(value: string | number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parsePrice(value: string): number {
  return Number(value.trim().replace(",", "."));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatBRL(value: string | number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parsePrice(value: string): number {
  return Number(value.trim().replace(",", "."));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatCompactBRL(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$ ${Math.round(value / 1000).toLocaleString("pt-BR")}k`;
  }
  return formatBRL(value);
}

export function formatLastAccess(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Hoje, ${time}`;
  if (diffDays === 1) return `Ontem, ${time}`;
  return date.toLocaleDateString("pt-BR");
}

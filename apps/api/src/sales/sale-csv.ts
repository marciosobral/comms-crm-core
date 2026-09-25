export function csvField(value: string): string {
  const sanitized = value
    .replace(/[;\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^[=+\-@]/.test(sanitized)) {
    return `'${sanitized}`;
  }

  return sanitized;
}

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export interface SaleCsvRow {
  date: Date;
  amount: unknown;
  customer: { name: string };
  plan: { name: string } | null;
  seller: { name: string };
  status: { value: string };
}

export function salesToCsv(sales: SaleCsvRow[]): string {
  const lines = ["data;cliente;plano;vendedor;status;valor"];
  for (const sale of sales) {
    const data = formatDate(sale.date);
    const cliente = csvField(sale.customer.name);
    const plano = csvField(sale.plan?.name ?? "-");
    const vendedor = csvField(sale.seller.name);
    const status = csvField(sale.status.value);
    const valor = Number(sale.amount).toFixed(2).replace(".", ",");

    lines.push(`${data};${cliente};${plano};${vendedor};${status};${valor}`);
  }
  return lines.join("\n");
}

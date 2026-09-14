export function parseMoney(value: string): number {
  const trimmed = value.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!trimmed) return Number.NaN;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function applyMoneyMask(raw: string): string {
  const hasComma = raw.includes(",");
  const [intRaw, ...fracParts] = raw.replace(/[^\d,]/g, "").split(",");
  const intDigits = (intRaw.replace(/^0+(?=\d)/, "") || "0").replace(/\D/g, "");
  const frac = fracParts.join("").replace(/\D/g, "").slice(0, 2);
  const withDots = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (hasComma || fracParts.length > 0) return `${withDots},${frac}`;
  return withDots;
}

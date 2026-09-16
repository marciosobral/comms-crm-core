/** Prisma Decimal(10, 2): 8 integer digits + 2 decimal places. */
export const MAX_MONEY_INTEGER_DIGITS = 8;
export const MAX_MONEY = 99_999_999.99;

export function parseMoney(value: string): number {
  const trimmed = value.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!trimmed) return Number.NaN;

  let normalized: string;
  if (trimmed.includes(",")) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d+\.\d{1,2}$/.test(trimmed)) {
    normalized = trimmed;
  } else {
    normalized = trimmed.replace(/\./g, "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

export function applyMoneyMask(raw: string): string {
  let working = raw.replace(/R\$/gi, "").replace(/\s/g, "");

  if (!working.includes(",")) {
    const lastDot = working.lastIndexOf(".");
    if (lastDot !== -1) {
      const frac = working.slice(lastDot + 1).replace(/\D/g, "");
      if (frac.length <= 2) {
        working = `${working.slice(0, lastDot)},${frac}`;
      }
    }
  }

  const hasComma = working.includes(",");
  const [intRaw, ...fracParts] = working.replace(/[^\d,]/g, "").split(",");
  const intDigits = (intRaw.replace(/^0+(?=\d)/, "") || "0")
    .replace(/\D/g, "")
    .slice(0, MAX_MONEY_INTEGER_DIGITS);
  const frac = fracParts.join("").replace(/\D/g, "").slice(0, 2);
  const withDots = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (hasComma || fracParts.length > 0) return `${withDots},${frac}`;
  return withDots;
}

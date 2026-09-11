export function nextReference(existing: string[]): string {
  const max = existing.reduce((acc, ref) => {
    if (!/^\d{1,4}$/.test(ref)) return acc;
    return Math.max(acc, Number(ref));
  }, 0);
  return String(max + 1).padStart(4, "0");
}

export function normalizeReference(input: string): string {
  const digits = input.replace(/\D/g, "").replace(/^0+/, "") || "0";
  return digits.padStart(4, "0");
}

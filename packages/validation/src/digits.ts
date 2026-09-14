export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function allSameDigits(digits: string): boolean {
  return digits.length > 0 && [...digits].every((d) => d === digits[0]);
}

export function mod11Check(digits: string, factors: number[]): number {
  const sum = digits.split("").reduce((acc, d, i) => acc + Number(d) * factors[i], 0);
  const rem = sum % 11;
  return rem < 2 ? 0 : 11 - rem;
}

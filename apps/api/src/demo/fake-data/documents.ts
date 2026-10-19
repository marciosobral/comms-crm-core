import { mod11Check } from "@comms-crm-core/validation";
import type { SeededRandom } from "./random";

const CPF_FACTORS_1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_FACTORS_2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_FACTORS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_FACTORS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function withCheckDigits(base: string, first: number[], second: number[]): string {
  const d1 = mod11Check(base, first);
  const d2 = mod11Check(`${base}${d1}`, second);
  return `${base}${d1}${d2}`;
}

export function fakeCpf(random: SeededRandom): string {
  return withCheckDigits(`${random.int(1, 9)}${random.digits(8)}`, CPF_FACTORS_1, CPF_FACTORS_2);
}

export function fakeCnpj(random: SeededRandom): string {
  return withCheckDigits(
    `${random.int(1, 9)}${random.digits(7)}0001`,
    CNPJ_FACTORS_1,
    CNPJ_FACTORS_2,
  );
}

import {
  applyCepMask,
  applyCnpjMask,
  applyCpfCnpjMask,
  applyCpfMask,
  applyMoneyMask,
  applyPhoneMask,
} from "@comms-core/validation";
import type { InputHTMLAttributes } from "react";
import { Input } from "./input";

const APPLY = {
  cpf: applyCpfMask,
  cnpj: applyCnpjMask,
  cpfCnpj: applyCpfCnpjMask,
  phone: applyPhoneMask,
  money: applyMoneyMask,
  cep: applyCepMask,
} as const;

export type MaskName = keyof typeof APPLY;

export function MaskedInput({
  mask,
  value,
  onChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  mask: MaskName;
  value: string;
  onChange: (value: string) => void;
}) {
  return <Input {...props} value={value} onChange={(e) => onChange(APPLY[mask](e.target.value))} />;
}

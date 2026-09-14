import {
  MESSAGES,
  digitsOnly,
  isCpf,
  isCpfCnpj,
  isEmail,
  isPhone,
  isUf,
  normalizeEmail,
  parseMoney,
} from "@comms-core/validation";
import { z } from "zod";

const requiredName = z.string().min(1, "Informe o nome");

const requiredEmail = z.string().refine((value) => isEmail(normalizeEmail(value)), {
  message: MESSAGES.email,
});

const optionalCpf = z.string().refine(
  (value) => {
    const digits = digitsOnly(value);
    return digits.length === 0 || isCpf(value);
  },
  { message: MESSAGES.cpf },
);

const optionalPhone = z.string().refine(
  (value) => {
    const digits = digitsOnly(value);
    return digits.length === 0 || isPhone(value);
  },
  { message: MESSAGES.phone },
);

const optionalEmail = z.string().refine(
  (value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 || isEmail(normalizeEmail(value));
  },
  { message: MESSAGES.email },
);

const optionalUf = z.string().refine(
  (value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 || isUf(value);
  },
  { message: MESSAGES.uf },
);

const requiredCpfCnpj = z.string().refine(
  (value) => digitsOnly(value).length > 0 && isCpfCnpj(value),
  { message: MESSAGES.cpfCnpj },
);

const priceField = z.string().refine(
  (value) => {
    const parsed = parseMoney(value);
    return Number.isFinite(parsed) && parsed > 0;
  },
  { message: MESSAGES.price },
);

const userBaseSchema = {
  name: requiredName,
  email: requiredEmail,
  cpf: optionalCpf,
  phone: optionalPhone,
  roleId: z.string(),
};

export const userCreateSchema = z
  .object({
    ...userBaseSchema,
    password: z.string().min(8, MESSAGES.password),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const userEditSchema = z.object({
  ...userBaseSchema,
  password: z.string(),
  confirmPassword: z.string(),
});

export const customerFormSchema = z.object({
  name: requiredName,
  cpfCnpj: requiredCpfCnpj,
  birthDate: z.string(),
  motherName: z.string(),
  email: optionalEmail,
  phone1: optionalPhone,
  phone2: optionalPhone,
  address: z.string(),
  city: z.string(),
  state: optionalUf,
});

export const planFormSchema = z
  .object({
    name: requiredName,
    type: z.enum(["FIXED", "INTERNET", "COMBO"]),
    speed: z.string(),
    featuresText: z.string(),
    basePrice: priceField,
    minPrice: priceField,
    salesScript: z.string(),
  })
  .refine((data) => parseMoney(data.minPrice) <= parseMoney(data.basePrice), {
    message: MESSAGES.priceRange,
    path: ["minPrice"],
  });

export type UserCreateFormValues = z.infer<typeof userCreateSchema>;
export type UserEditFormValues = z.infer<typeof userEditSchema>;
export type CustomerFormValues = z.infer<typeof customerFormSchema>;
export type PlanFormValues = z.infer<typeof planFormSchema>;

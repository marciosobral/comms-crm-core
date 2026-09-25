import {
  MAX_MONEY,
  MESSAGES,
  digitsOnly,
  isCep,
  isCpf,
  isCpfCnpj,
  isEmail,
  isPhone,
  isUf,
  normalizeEmail,
  parseMoney,
} from "@comms-crm-core/validation";
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

const optionalCep = z.string().refine(
  (value) => {
    const digits = digitsOnly(value);
    return digits.length === 0 || isCep(value);
  },
  { message: MESSAGES.cep },
);

export const addressFormSchema = z.object({
  postalCode: optionalCep,
  street: z.string(),
  number: z.string(),
  noNumber: z.boolean(),
  complement: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: optionalUf,
  isDefault: z.boolean(),
});

const requiredCpfCnpj = z
  .string()
  .refine((value) => digitsOnly(value).length > 0 && isCpfCnpj(value), {
    message: MESSAGES.cpfCnpj,
  });

const priceField = z.string().refine(
  (value) => {
    const parsed = parseMoney(value);
    return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_MONEY;
  },
  { message: MESSAGES.price },
);

const optionalBirthDate = z.string().refine(
  (value) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
    const [year, month, day] = trimmed.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return false;
    }
    if (year < 1900) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  },
  { message: "Data inválida" },
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
    reference: z.string().regex(/^\d{0,4}$/, "Referência deve ter até 4 dígitos"),
    password: z.string().min(8, MESSAGES.password),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const userEditSchema = z.object({
  ...userBaseSchema,
  reference: z.string(),
  password: z.string(),
  confirmPassword: z.string(),
});

export const customerFormSchema = z.object({
  name: requiredName,
  cpfCnpj: requiredCpfCnpj,
  birthDate: optionalBirthDate,
  motherName: z.string(),
  email: optionalEmail,
  phone1: optionalPhone,
  phone2: optionalPhone,
  addresses: z.array(addressFormSchema),
});

export function customerFormSchemaForEdit(options: { documentLocked: boolean }) {
  if (!options.documentLocked) return customerFormSchema;
  return customerFormSchema.extend({ cpfCnpj: z.string() });
}

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cargo"),
  description: z.string().trim(),
  permissions: z.array(z.string()),
});

export const planFormSchema = z
  .object({
    name: requiredName,
    typeId: z.string().min(1, "Selecione o tipo"),
    speed: z.string(),
    features: z.array(z.string()),
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
export type RoleFormValues = z.infer<typeof roleFormSchema>;
export type PlanFormValues = z.infer<typeof planFormSchema>;

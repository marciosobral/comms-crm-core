import {
  MESSAGES,
  digitsOnly,
  formatDisplayCpfCnpj,
  formatPhone,
  isCep,
  isCpf,
  isCpfCnpj,
  isMaskedCpfCnpj,
  isUf,
  normalizeEmail,
} from "@comms-crm-core/validation";
import type { FieldErrors } from "react-hook-form";
import { z } from "zod";
import { emptyAddressForm, formToAddressPayload, isAddressFormEmpty } from "./address";
import { optionalEmail, optionalPhone } from "./form-schemas";
import type {
  BankAccountType,
  CustomerInput,
  SaleDetail,
  SalePayload,
  SaleUpdatePayload,
} from "./types";

const addressDraftSchema = z.object({
  postalCode: z.string(),
  street: z.string(),
  number: z.string(),
  noNumber: z.boolean(),
  complement: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  isDefault: z.boolean(),
});

const saleFormBaseSchema = z.object({
  customerName: z.string(),
  customerCpfCnpj: z.string(),
  customerBirthDate: z.string(),
  customerMotherName: z.string(),
  customerEmail: z.string(),
  customerPhone1: z.string(),
  customerPhone2: z.string(),
  address: addressDraftSchema,
  planTypeId: z.string(),
  planId: z.string(),
  statusId: z.string(),
  paymentMethodId: z.string(),
  mailingId: z.string(),
  amount: z.number(),
  dueDay: z.string(),
  date: z.string(),
  orderNumber: z.string(),
  login: z.string(),
  notes: z.string(),
  scheduleDate: z.string(),
  schedulePeriodId: z.string(),
  installedAt: z.string(),
  brscan: z.boolean(),
  bankCode: z.string(),
  bankAgency: z.string(),
  bankAgencyDigit: z.string(),
  bankAccount: z.string(),
  bankAccountDigit: z.string(),
  bankAccountType: z.union([z.literal("CHECKING"), z.literal("SAVINGS"), z.literal("")]),
  accountHolder: z.union([z.literal("customer"), z.literal("other"), z.literal("")]),
  accountHolderName: z.string(),
  accountHolderCpf: z.string(),
  sellerId: z.string(),
  supervisorId: z.string(),
  bkoId: z.string(),
  auditorId: z.string(),
});

export type SaleFormValues = z.infer<typeof saleFormBaseSchema>;

export interface SaleFormSchemaOptions {
  mode: "create" | "edit";
  hasSelectedCustomer: boolean;
  editingNewAddress: boolean;
}

export function saleFormSchema(options: SaleFormSchemaOptions): z.ZodType<SaleFormValues> {
  if (options.mode !== "create") return saleFormBaseSchema;

  return saleFormBaseSchema
    .extend({
      customerEmail: optionalEmail,
      customerPhone1: optionalPhone,
      customerPhone2: optionalPhone,
    })
    .superRefine((values, ctx) => {
      if (!options.hasSelectedCustomer && !isCpfCnpj(digitsOnly(values.customerCpfCnpj))) {
        ctx.addIssue({ code: "custom", message: MESSAGES.cpfCnpj, path: ["customerCpfCnpj"] });
      }
      if (options.editingNewAddress) {
        if (values.address.postalCode && !isCep(values.address.postalCode)) {
          ctx.addIssue({ code: "custom", message: MESSAGES.cep, path: ["address", "postalCode"] });
        }
        if (values.address.state && !isUf(values.address.state)) {
          ctx.addIssue({ code: "custom", message: MESSAGES.uf, path: ["address", "state"] });
        }
      }
    });
}

export function buildSaleFormDefaultValues(sale?: SaleDetail): SaleFormValues {
  const initialAccountType: BankAccountType | "" = sale?.bankAccountType ?? "";
  const initialAccountHolder: "customer" | "other" | "" =
    sale?.accountHolderIsCustomer === true
      ? "customer"
      : sale?.accountHolderIsCustomer === false
        ? "other"
        : "";
  return {
    customerName: sale?.customer.name ?? "",
    customerCpfCnpj: sale?.customer.cpfCnpj ? formatDisplayCpfCnpj(sale.customer.cpfCnpj) : "",
    customerBirthDate: sale?.customer.birthDate?.slice(0, 10) ?? "",
    customerMotherName: sale?.customer.motherName ?? "",
    customerEmail: sale?.customer.email ?? "",
    customerPhone1: sale?.customer.phone1 ? formatPhone(sale.customer.phone1) : "",
    customerPhone2: sale?.customer.phone2 ? formatPhone(sale.customer.phone2) : "",
    address: emptyAddressForm(),
    planTypeId: sale?.plan?.type.id ?? "",
    planId: sale?.plan?.id ?? "",
    statusId: sale?.status.id ?? "",
    paymentMethodId: sale?.paymentMethod?.id ?? "",
    mailingId: sale?.mailing?.id ?? "",
    amount: sale ? Number(sale.amount) : 0,
    dueDay: sale?.dueDay ? String(sale.dueDay) : "",
    date: sale?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    orderNumber: sale?.orderNumber ?? "",
    login: sale?.login ?? "",
    notes: sale?.notes ?? "",
    scheduleDate: sale?.scheduleDate?.slice(0, 10) ?? "",
    schedulePeriodId: sale?.schedulePeriod?.id ?? "",
    installedAt: sale?.installedAt?.slice(0, 10) ?? "",
    brscan: false,
    bankCode: sale?.bankCode ?? "",
    bankAgency: sale?.bankAgency ?? "",
    bankAgencyDigit: sale?.bankAgencyDigit ?? "",
    bankAccount: sale?.bankAccount ?? "",
    bankAccountDigit: sale?.bankAccountDigit ?? "",
    bankAccountType: initialAccountType,
    accountHolder: initialAccountHolder,
    accountHolderName: sale?.accountHolderName ?? "",
    accountHolderCpf: sale?.accountHolderCpf ? formatDisplayCpfCnpj(sale.accountHolderCpf) : "",
    sellerId: sale?.seller.id ?? "",
    supervisorId: sale?.supervisor?.id ?? "",
    bkoId: sale?.bko?.id ?? "",
    auditorId: sale?.auditor?.id ?? "",
  };
}

export function isDirectDebitPayment(paymentLabel: string | null | undefined): boolean {
  return (paymentLabel ?? "").toUpperCase().includes("DÉBITO");
}

export function isBankDataComplete(values: SaleFormValues): boolean {
  const holderCpfUnchanged = isMaskedCpfCnpj(values.accountHolderCpf);
  return Boolean(
    values.bankCode &&
      values.bankAgency.trim() &&
      values.bankAccount.trim() &&
      values.bankAccountDigit.trim() &&
      values.bankAccountType &&
      (values.accountHolder === "customer" ||
        (values.accountHolder === "other" &&
          values.accountHolderName.trim() &&
          (holderCpfUnchanged || isCpf(values.accountHolderCpf)))),
  );
}

export interface SaleFormBlockingContext {
  mode: "create" | "edit";
  hasValidPlan: boolean;
  isDirectDebit: boolean;
  isBankDataComplete: boolean;
  requireExistingCustomerSelection: boolean;
}

// These checks depend on data outside the form values, so they run outside the zod schema.
export function firstSaleFormBlockingMessage(
  values: Pick<SaleFormValues, "statusId" | "date" | "paymentMethodId">,
  context: SaleFormBlockingContext,
): string | null {
  if (!values.statusId || !context.hasValidPlan || !values.date) {
    return "Preencha plano, status e data";
  }
  if (!values.paymentMethodId) {
    return "Selecione a forma de pagamento";
  }
  if (context.isDirectDebit && !context.isBankDataComplete) {
    return "Preencha todos os dados bancários para débito automático";
  }
  if (context.mode === "create" && context.requireExistingCustomerSelection) {
    return "Selecione um cliente";
  }
  return null;
}

export function firstSaleFormFieldErrorMessage(
  errors: FieldErrors<SaleFormValues>,
): string | undefined {
  return (
    errors.customerCpfCnpj?.message ??
    errors.customerEmail?.message ??
    errors.customerPhone1?.message ??
    errors.customerPhone2?.message ??
    errors.address?.postalCode?.message ??
    errors.address?.state?.message
  );
}

export interface SaleFormPayloadContext {
  mode: "create" | "edit";
  isDirectDebit: boolean;
  canChangeSeller: boolean;
  customerSource: "existing" | "new";
  selectedCustomerId?: string;
  customerAddressId: string;
}

export function toSalePayload(
  values: SaleFormValues,
  context: SaleFormPayloadContext & { mode: "create" },
): SalePayload;
export function toSalePayload(
  values: SaleFormValues,
  context: SaleFormPayloadContext & { mode: "edit" },
): SaleUpdatePayload;
export function toSalePayload(
  values: SaleFormValues,
  context: SaleFormPayloadContext,
): SalePayload | SaleUpdatePayload {
  const cleared = context.mode === "edit" ? null : undefined;
  const holderCpfUnchanged = isMaskedCpfCnpj(values.accountHolderCpf);

  const common = {
    planId: values.planId || cleared,
    paymentMethodId: values.paymentMethodId || undefined,
    mailingId: values.mailingId || undefined,
    amount: values.amount,
    dueDay: values.dueDay ? Number(values.dueDay) : undefined,
    date: values.date,
    orderNumber: values.orderNumber || undefined,
    login: values.login || undefined,
    notes: values.notes || undefined,
    scheduleDate: values.scheduleDate || cleared,
    schedulePeriodId: values.schedulePeriodId || cleared,
    installedAt: values.installedAt || cleared,
    ...(context.isDirectDebit
      ? {
          bankCode: values.bankCode,
          bankAgency: digitsOnly(values.bankAgency),
          bankAgencyDigit: values.bankAgencyDigit || undefined,
          bankAccount: digitsOnly(values.bankAccount),
          bankAccountDigit: values.bankAccountDigit.toUpperCase(),
          bankAccountType: values.bankAccountType || undefined,
          accountHolderIsCustomer: values.accountHolder === "customer",
          accountHolderName:
            values.accountHolder === "other" ? values.accountHolderName.trim() : undefined,
          accountHolderCpf:
            values.accountHolder === "other" && !holderCpfUnchanged
              ? digitsOnly(values.accountHolderCpf)
              : undefined,
        }
      : {}),
    supervisorId: values.supervisorId || undefined,
    bkoId: values.bkoId || undefined,
    auditorId: values.auditorId || undefined,
  };

  if (context.mode === "edit") {
    return common;
  }

  const customer: CustomerInput = {
    id: context.selectedCustomerId,
    name: values.customerName,
    cpfCnpj: context.selectedCustomerId ? undefined : digitsOnly(values.customerCpfCnpj),
    birthDate: values.customerBirthDate || undefined,
    motherName: values.customerMotherName || undefined,
    email: values.customerEmail ? normalizeEmail(values.customerEmail) : undefined,
    phone1: values.customerPhone1 ? digitsOnly(values.customerPhone1) : undefined,
    phone2: values.customerPhone2 ? digitsOnly(values.customerPhone2) : undefined,
  };
  if (context.customerSource === "existing" && context.customerAddressId !== "new") {
    customer.customerAddressId = context.customerAddressId;
  } else if (!isAddressFormEmpty(values.address)) {
    customer.address = formToAddressPayload(values.address);
  }

  return {
    ...common,
    statusId: values.statusId,
    sellerId: context.canChangeSeller ? values.sellerId || undefined : undefined,
    brscan: values.brscan || undefined,
    customer,
  };
}

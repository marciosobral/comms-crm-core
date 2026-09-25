import { AddressFields } from "@/components/customers/address-fields";
import { Button, Checkbox, Field, Input, MaskedInput, Select, Textarea } from "@/components/ui";
import { useUploadAttachment } from "@/hooks/use-attachments";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { usePlans } from "@/hooks/use-plans";
import { useCreateSale, useUpdateSale } from "@/hooks/use-sales";
import { useUsers } from "@/hooks/use-users";
import {
  addressToForm,
  defaultAddress,
  emptyAddressForm,
  formToAddressPayload,
  formatAddressCityUf,
  isAddressFormEmpty,
} from "@/lib/address";
import { ApiError } from "@/lib/api";
import { AUDIO_ACCEPT, DOCUMENT_ACCEPT } from "@/lib/attachment-kinds";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import type {
  Address,
  BankAccountType,
  CustomerInput,
  SaleDetail,
  SalePayload,
  SaleUpdatePayload,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  MESSAGES,
  digitsOnly,
  formatCep,
  formatDisplayCpfCnpj,
  formatPhone,
  isCep,
  isCpf,
  isCpfCnpj,
  isEmail,
  isMaskedCpfCnpj,
  isPhone,
  isUf,
  normalizeEmail,
} from "@comms-crm-core/validation";
import { CalendarCheck, Plus, Repeat } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { customerToSaleFields, emptyCustomerSaleFields } from "./customer-sale-fields";
import { CustomerSearch } from "./customer-search";
import { DirectDebitFields } from "./direct-debit-fields";
import { FilePicker } from "./file-picker";
import { PlanPanel } from "./plan-panel";
import { PriceSlider } from "./price-slider";
import { SaleChecklist } from "./sale-checklist";
import { SaleSummary } from "./sale-summary";

const CUSTOMER_SOURCE_TABS = [
  { id: "existing", label: "Cliente existente" },
  { id: "new", label: "Novo" },
] as const;

type CustomerSource = (typeof CUSTOMER_SOURCE_TABS)[number]["id"];

function customerInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface SaleFormProps {
  mode: "create" | "edit";
  sale?: SaleDetail;
  onDone: (saleId: string) => void;
}

type CustomerFieldErrors = Partial<{
  customerCpfCnpj: string;
  customerEmail: string;
  customerPhone1: string;
  customerPhone2: string;
  addressPostalCode: string;
  addressState: string;
}>;

export function SaleForm({ mode, sale, onDone }: SaleFormProps) {
  const { user } = useCurrentUser();
  const subject = user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null;
  const canEditLocked = hasPermission(subject, "sales.edit_locked_fields");
  const canChangeSeller = hasPermission(subject, "sales.change_seller");
  const canViewCustomers = hasPermission(subject, "customers.view");
  const [customerSource, setCustomerSource] = useState<CustomerSource>("new");
  const [existingSelected, setExistingSelected] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [searchSeed, setSearchSeed] = useState("");
  const [searchNonce, setSearchNonce] = useState(0);
  const [catalogAddresses, setCatalogAddresses] = useState<Address[]>([]);
  const [customerAddressId, setCustomerAddressId] = useState("new");
  const [addressDraft, setAddressDraft] = useState(() => emptyAddressForm());
  const [showInstalledAt, setShowInstalledAt] = useState(Boolean(sale?.installedAt));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);
  const uploadAttachment = useUploadAttachment();

  const plans = usePlans();
  const planTypes = useActiveDomainValues("PLAN_TYPE");
  const statuses = useActiveDomainValues("SALE_STATUS");
  const payments = useActiveDomainValues("PAYMENT_METHOD");
  const mailings = useActiveDomainValues("MAILING");
  const schedulePeriods = useActiveDomainValues("SCHEDULE_PERIOD");
  const users = useUsers();

  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const mutation = mode === "edit" ? updateSale : createSale;

  const initialAccountType: BankAccountType | "" = sale?.bankAccountType ?? "";
  const initialAccountHolder: "customer" | "other" | "" =
    sale?.accountHolderIsCustomer === true
      ? "customer"
      : sale?.accountHolderIsCustomer === false
        ? "other"
        : "";
  const [form, setForm] = useState(() => ({
    customerName: sale?.customer.name ?? "",
    customerCpfCnpj: sale?.customer.cpfCnpj ? formatDisplayCpfCnpj(sale.customer.cpfCnpj) : "",
    customerBirthDate: sale?.customer.birthDate?.slice(0, 10) ?? "",
    customerMotherName: sale?.customer.motherName ?? "",
    customerEmail: sale?.customer.email ?? "",
    customerPhone1: sale?.customer.phone1 ? formatPhone(sale.customer.phone1) : "",
    customerPhone2: sale?.customer.phone2 ? formatPhone(sale.customer.phone2) : "",
    planTypeId: sale?.plan?.type.id ?? "",
    planId: sale?.plan?.id ?? "",
    statusId: sale?.status.id ?? "",
    paymentMethodId: sale?.paymentMethod?.id ?? "",
    mailingId: sale?.mailing?.id ?? "",
    amount: sale ? Number(sale.amount) : 0,
    dueDay: sale?.dueDay ? String(sale.dueDay) : "",
    date: sale?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    orderNumber: sale?.orderNumber ?? "",
    brscan: false,
    login: sale?.login ?? "",
    notes: sale?.notes ?? "",
    scheduleDate: sale?.scheduleDate?.slice(0, 10) ?? "",
    schedulePeriodId: sale?.schedulePeriod?.id ?? "",
    installedAt: sale?.installedAt?.slice(0, 10) ?? "",
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
  }));
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});

  const set = (patch: Partial<typeof form>) => setForm((c) => ({ ...c, ...patch }));

  const resetAddress = () => {
    setCatalogAddresses([]);
    setCustomerAddressId("new");
    setAddressDraft(emptyAddressForm());
  };

  const applyCatalogAddress = (addresses: Address[], selectedId?: string) => {
    setCatalogAddresses(addresses);
    const selected = addresses.find((item) => item.id === selectedId) ?? defaultAddress(addresses);
    if (selected) {
      setCustomerAddressId(selected.id);
      setAddressDraft(addressToForm(selected));
      return;
    }
    setCustomerAddressId("new");
    setAddressDraft(emptyAddressForm());
  };

  useEffect(() => {
    if (mode === "create" && user) {
      setForm((c) => (c.sellerId ? c : { ...c, sellerId: user.id }));
    }
  }, [mode, user]);

  useEffect(() => {
    const firstType = planTypes.data?.[0];
    if (firstType) setForm((c) => (c.planTypeId ? c : { ...c, planTypeId: firstType.id }));
  }, [planTypes.data]);

  const pricingPlan = useMemo(
    () => (plans.data ?? []).find((plan) => plan.id === form.planId) ?? null,
    [plans.data, form.planId],
  );

  const selectedPayment = (payments.data ?? []).find((p) => p.id === form.paymentMethodId);
  const isDebit = (selectedPayment?.value ?? "").toUpperCase().includes("DÉBITO");
  const holderCpfUnchanged = isMaskedCpfCnpj(form.accountHolderCpf);
  const bankDataComplete = Boolean(
    form.bankCode &&
      form.bankAgency.trim() &&
      form.bankAccount.trim() &&
      form.bankAccountDigit.trim() &&
      form.bankAccountType &&
      (form.accountHolder === "customer" ||
        (form.accountHolder === "other" &&
          form.accountHolderName.trim() &&
          (holderCpfUnchanged || isCpf(form.accountHolderCpf)))),
  );

  const priceMin = pricingPlan ? Number(pricingPlan.minPrice) : 0;
  const priceMax = pricingPlan ? Number(pricingPlan.basePrice) : 0;

  const typePlans = (plans.data ?? []).filter((p) => p.active && p.typeId === form.planTypeId);

  const onPlanTypeChange = (planTypeId: string) => {
    set({ planTypeId, planId: "", amount: 0 });
  };

  const onPlanChange = (id: string) => {
    const nextPlan = (plans.data ?? []).find((p) => p.id === id);
    set({ planId: id, amount: nextPlan ? Number(nextPlan.basePrice) : 0 });
  };

  const onSubmit = () => {
    setError("");
    setFieldErrors({});
    if (!form.statusId || !pricingPlan || !form.date) {
      setError("Preencha plano, status e data");
      return;
    }
    if (!form.paymentMethodId) {
      setError("Selecione a forma de pagamento");
      return;
    }
    if (isDebit && !bankDataComplete) {
      setError("Preencha todos os dados bancários para débito automático");
      return;
    }

    if (mode === "create") {
      if (canViewCustomers && customerSource === "existing" && !existingSelected) {
        setError("Selecione um cliente");
        return;
      }
      const doc = digitsOnly(form.customerCpfCnpj);
      const nextFieldErrors: CustomerFieldErrors = {};

      if (!selectedCustomerId && !isCpfCnpj(doc)) {
        nextFieldErrors.customerCpfCnpj = MESSAGES.cpfCnpj;
        setFieldErrors(nextFieldErrors);
        setError(MESSAGES.cpfCnpj);
        return;
      }
      if (form.customerEmail && !isEmail(normalizeEmail(form.customerEmail))) {
        nextFieldErrors.customerEmail = MESSAGES.email;
        setFieldErrors(nextFieldErrors);
        setError(MESSAGES.email);
        return;
      }
      if (form.customerPhone1 && !isPhone(digitsOnly(form.customerPhone1))) {
        nextFieldErrors.customerPhone1 = MESSAGES.phone;
        setFieldErrors(nextFieldErrors);
        setError(MESSAGES.phone);
        return;
      }
      if (form.customerPhone2 && !isPhone(digitsOnly(form.customerPhone2))) {
        nextFieldErrors.customerPhone2 = MESSAGES.phone;
        setFieldErrors(nextFieldErrors);
        setError(MESSAGES.phone);
        return;
      }
      const editingNewAddress = customerSource === "new" || customerAddressId === "new";
      if (editingNewAddress && addressDraft.postalCode && !isCep(addressDraft.postalCode)) {
        nextFieldErrors.addressPostalCode = MESSAGES.cep;
        setFieldErrors(nextFieldErrors);
        setError(MESSAGES.cep);
        return;
      }
      if (editingNewAddress && addressDraft.state && !isUf(addressDraft.state)) {
        nextFieldErrors.addressState = MESSAGES.uf;
        setFieldErrors(nextFieldErrors);
        setError(MESSAGES.uf);
        return;
      }
    }

    const cleared = mode === "edit" ? null : undefined;
    const common = {
      planId: form.planId || cleared,
      paymentMethodId: form.paymentMethodId || undefined,
      mailingId: form.mailingId || undefined,
      amount: form.amount,
      dueDay: form.dueDay ? Number(form.dueDay) : undefined,
      date: form.date,
      orderNumber: form.orderNumber || undefined,
      login: form.login || undefined,
      notes: form.notes || undefined,
      scheduleDate: form.scheduleDate || cleared,
      schedulePeriodId: form.schedulePeriodId || cleared,
      installedAt: form.installedAt || cleared,
      ...(isDebit
        ? {
            bankCode: form.bankCode,
            bankAgency: digitsOnly(form.bankAgency),
            bankAgencyDigit: form.bankAgencyDigit || undefined,
            bankAccount: digitsOnly(form.bankAccount),
            bankAccountDigit: form.bankAccountDigit.toUpperCase(),
            bankAccountType: form.bankAccountType || undefined,
            accountHolderIsCustomer: form.accountHolder === "customer",
            accountHolderName:
              form.accountHolder === "other" ? form.accountHolderName.trim() : undefined,
            accountHolderCpf:
              form.accountHolder === "other" && !holderCpfUnchanged
                ? digitsOnly(form.accountHolderCpf)
                : undefined,
          }
        : {}),
      supervisorId: form.supervisorId || undefined,
      bkoId: form.bkoId || undefined,
      auditorId: form.auditorId || undefined,
    };

    const onSuccess = (result: { id: string }) => onDone(result.id);
    const onError = (err: unknown) =>
      setError(err instanceof ApiError ? err.message : "Erro ao salvar venda");

    if (mode === "edit" && sale) {
      const payload: SaleUpdatePayload & { id: string } = { id: sale.id, ...common };
      updateSale.mutate(payload, { onSuccess, onError });
    } else {
      const customer: CustomerInput = {
        id: selectedCustomerId,
        name: form.customerName,
        cpfCnpj: selectedCustomerId ? undefined : digitsOnly(form.customerCpfCnpj),
        birthDate: form.customerBirthDate || undefined,
        motherName: form.customerMotherName || undefined,
        email: form.customerEmail ? normalizeEmail(form.customerEmail) : undefined,
        phone1: form.customerPhone1 ? digitsOnly(form.customerPhone1) : undefined,
        phone2: form.customerPhone2 ? digitsOnly(form.customerPhone2) : undefined,
      };
      if (customerSource === "existing" && customerAddressId !== "new") {
        customer.customerAddressId = customerAddressId;
      } else if (!isAddressFormEmpty(addressDraft)) {
        customer.address = formToAddressPayload(addressDraft);
      }
      const payload: SalePayload = {
        ...common,
        statusId: form.statusId,
        sellerId: canChangeSeller ? form.sellerId || undefined : undefined,
        brscan: form.brscan || undefined,
        customer,
      };
      createSale.mutate(payload, {
        onSuccess: async (result) => {
          const pending = [
            { file: audioFile, kind: "AUDIO" as const },
            { file: proofOfAddressFile, kind: "PROOF_OF_ADDRESS" as const },
          ];
          for (const { file, kind } of pending) {
            if (!file) continue;
            // A failed upload does not undo the sale; the sale page shows what is missing.
            await uploadAttachment.mutateAsync({ saleId: result.id, file, kind }).catch(() => null);
          }
          onDone(result.id);
        },
        onError,
      });
    }
  };

  const domainOptions = (rows: { id: string; value: string }[] | undefined) =>
    (rows ?? []).map((row) => (
      <option key={row.id} value={row.id}>
        {row.value}
      </option>
    ));

  const userOptions = (rows: { id: string; name: string }[] | undefined) =>
    (rows ?? []).map((row) => (
      <option key={row.id} value={row.id}>
        {row.name}
      </option>
    ));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[1fr_360px] items-start gap-6">
        <div className="flex flex-col gap-6">
          {mode === "create" ? (
            <>
              <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-h3 text-primary">Dados do cliente</h3>
                  {canViewCustomers ? (
                    <div className="inline-flex shrink-0 gap-1 rounded-[10px] border border-default bg-elevated p-1">
                      {CUSTOMER_SOURCE_TABS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (item.id === customerSource) return;
                            setCustomerSource(item.id);
                            setExistingSelected(false);
                            setSelectedCustomerId(undefined);
                            setSearchSeed("");
                            setFieldErrors({});
                            set(emptyCustomerSaleFields());
                            resetAddress();
                          }}
                          className={cn(
                            "flex h-8 items-center justify-center rounded-md px-3 text-small transition-colors",
                            customerSource === item.id
                              ? "bg-surface text-primary"
                              : "text-secondary hover:text-primary",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {canViewCustomers && customerSource === "existing" && !existingSelected ? (
                  <CustomerSearch
                    key={searchNonce}
                    initialQuery={searchSeed}
                    onSelect={(customer) => {
                      setFieldErrors({});
                      setExistingSelected(true);
                      setSelectedCustomerId(customer.id);
                      setSearchSeed(customer.name);
                      set(customerToSaleFields(customer));
                      applyCatalogAddress(customer.addresses ?? []);
                    }}
                  />
                ) : null}
                {customerSource === "existing" && existingSelected ? (
                  <div className="flex flex-col gap-4 rounded-lg border border-default bg-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-caption text-accent">
                          {customerInitials(form.customerName) || "?"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-h3 text-primary">
                            {form.customerName || "-"}
                          </p>
                          <p className="mt-0.5 truncate text-caption text-muted">
                            {[
                              form.customerCpfCnpj,
                              form.customerBirthDate
                                ? `Nasc. ${formatDate(form.customerBirthDate)}`
                                : null,
                              form.customerMotherName ? `Mãe: ${form.customerMotherName}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Cliente selecionado"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        icon={Repeat}
                        className="h-8 shrink-0 px-3 text-small"
                        aria-label="Trocar cliente"
                        onClick={() => {
                          setSearchSeed(form.customerName);
                          setSearchNonce((n) => n + 1);
                          setExistingSelected(false);
                          setSelectedCustomerId(undefined);
                          setFieldErrors({});
                          set(emptyCustomerSaleFields());
                          resetAddress();
                        }}
                      >
                        Trocar
                      </Button>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-subtle pt-4">
                      <p className="text-caption text-muted">Contato</p>
                      <div className="grid grid-cols-3 gap-4">
                        <Field
                          optional
                          label="E-mail"
                          htmlFor="c-email"
                          error={fieldErrors.customerEmail}
                        >
                          <Input
                            id="c-email"
                            type="email"
                            value={form.customerEmail}
                            onChange={(e) => set({ customerEmail: e.target.value })}
                          />
                        </Field>
                        <Field
                          optional
                          label="Contato 1"
                          htmlFor="c-phone1"
                          error={fieldErrors.customerPhone1}
                        >
                          <MaskedInput
                            id="c-phone1"
                            mask="phone"
                            placeholder="(62) 90000-0000"
                            value={form.customerPhone1}
                            onChange={(value) => set({ customerPhone1: value })}
                          />
                        </Field>
                        <Field
                          optional
                          label="Contato 2"
                          htmlFor="c-phone2"
                          error={fieldErrors.customerPhone2}
                        >
                          <MaskedInput
                            id="c-phone2"
                            mask="phone"
                            placeholder="(62) 90000-0000"
                            value={form.customerPhone2}
                            onChange={(value) => set({ customerPhone2: value })}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ) : null}
                {customerSource === "new" ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Field label="Nome / Razão social" htmlFor="c-name">
                        <Input
                          id="c-name"
                          value={form.customerName}
                          onChange={(e) => set({ customerName: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="CPF/CNPJ" htmlFor="c-doc" error={fieldErrors.customerCpfCnpj}>
                      <MaskedInput
                        id="c-doc"
                        mask="cpfCnpj"
                        placeholder="000.000.000-00"
                        value={form.customerCpfCnpj}
                        onChange={(value) => set({ customerCpfCnpj: value })}
                      />
                    </Field>
                    <Field optional label="Data de nascimento" htmlFor="c-birth">
                      <Input
                        id="c-birth"
                        type="date"
                        min="1900-01-01"
                        max="2100-12-31"
                        value={form.customerBirthDate}
                        onChange={(e) => set({ customerBirthDate: e.target.value })}
                      />
                    </Field>
                    <div className="col-span-2">
                      <Field optional label="Nome da mãe" htmlFor="c-mother">
                        <Input
                          id="c-mother"
                          value={form.customerMotherName}
                          onChange={(e) => set({ customerMotherName: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field
                      optional
                      label="E-mail"
                      htmlFor="c-email"
                      error={fieldErrors.customerEmail}
                    >
                      <Input
                        id="c-email"
                        type="email"
                        value={form.customerEmail}
                        onChange={(e) => set({ customerEmail: e.target.value })}
                      />
                    </Field>
                    <Field
                      optional
                      label="Contato 1"
                      htmlFor="c-phone1"
                      error={fieldErrors.customerPhone1}
                    >
                      <MaskedInput
                        id="c-phone1"
                        mask="phone"
                        placeholder="(62) 90000-0000"
                        value={form.customerPhone1}
                        onChange={(value) => set({ customerPhone1: value })}
                      />
                    </Field>
                    <Field
                      optional
                      label="Contato 2"
                      htmlFor="c-phone2"
                      error={fieldErrors.customerPhone2}
                    >
                      <MaskedInput
                        id="c-phone2"
                        mask="phone"
                        placeholder="(62) 90000-0000"
                        value={form.customerPhone2}
                        onChange={(value) => set({ customerPhone2: value })}
                      />
                    </Field>
                  </div>
                ) : null}
              </section>
              {customerSource === "new" || existingSelected ? (
                <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
                  <h3 className="text-h3 text-primary">Endereço</h3>
                  {customerSource === "existing" ? (
                    <div className="grid grid-cols-2 gap-3">
                      {catalogAddresses.map((item) => {
                        const selected = item.id === customerAddressId;
                        const number = item.noNumber ? "S/N" : item.number;
                        const street = [item.street, number].filter(Boolean).join(", ");
                        const cityUf = formatAddressCityUf(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => applyCatalogAddress(catalogAddresses, item.id)}
                            className={cn(
                              "flex min-w-0 items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                              selected
                                ? "border-accent bg-surface-hover"
                                : "border-default bg-elevated hover:border-strong",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                selected ? "border-accent" : "border-strong",
                              )}
                            >
                              {selected ? (
                                <span className="h-2 w-2 rounded-full bg-accent" />
                              ) : null}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="flex items-center gap-2">
                                <span className="min-w-0 wrap-break-word text-body text-primary">
                                  {street || "Endereço sem logradouro"}
                                </span>
                                {item.isDefault ? (
                                  <span className="shrink-0 rounded-full border border-accent-border bg-accent-subtle px-2 text-caption text-accent">
                                    Padrão
                                  </span>
                                ) : null}
                              </span>
                              <span className="wrap-break-word text-caption text-muted">
                                {[
                                  item.complement,
                                  item.neighborhood,
                                  cityUf === "-" ? null : cityUf,
                                  item.postalCode ? formatCep(item.postalCode) : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        aria-pressed={customerAddressId === "new"}
                        onClick={() => {
                          setCustomerAddressId("new");
                          setAddressDraft(emptyAddressForm());
                        }}
                        className={cn(
                          "flex min-h-18 items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-small transition-colors",
                          customerAddressId === "new"
                            ? "border-accent bg-surface-hover text-primary"
                            : "border-default text-secondary hover:border-strong hover:text-primary",
                        )}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Novo endereço
                      </button>
                    </div>
                  ) : null}
                  {customerSource === "existing" && customerAddressId !== "new" ? null : (
                    <AddressFields
                      idPrefix="c-addr"
                      value={addressDraft}
                      onChange={(patch) => setAddressDraft((current) => ({ ...current, ...patch }))}
                      errors={{
                        postalCode: fieldErrors.addressPostalCode,
                        state: fieldErrors.addressState,
                      }}
                    />
                  )}
                </section>
              ) : null}
            </>
          ) : null}

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Plano e valor</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Tipo" htmlFor="s-plan-type">
                <Select
                  id="s-plan-type"
                  value={form.planTypeId}
                  onChange={(e) => onPlanTypeChange(e.target.value)}
                >
                  {(planTypes.data ?? []).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.value}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="col-span-2">
                <Field label="Plano" htmlFor="s-plan">
                  <Select
                    id="s-plan"
                    value={form.planId}
                    onChange={(e) => onPlanChange(e.target.value)}
                  >
                    <option value="">Nenhum</option>
                    {typePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            {pricingPlan ? (
              <PriceSlider
                min={priceMin}
                max={priceMax}
                value={form.amount}
                onChange={(amount) => set({ amount })}
              />
            ) : (
              <p className="text-caption text-muted">Selecione um plano para definir o valor.</p>
            )}

            <div className="grid grid-cols-3 gap-4">
              <Field label="Data da venda" htmlFor="s-date">
                <Input
                  id="s-date"
                  type="date"
                  min="1900-01-01"
                  max="2100-12-31"
                  value={form.date}
                  onChange={(e) => set({ date: e.target.value })}
                />
              </Field>
              <Field label="Forma de pagamento" htmlFor="s-payment">
                <Select
                  id="s-payment"
                  value={form.paymentMethodId}
                  onChange={(e) => set({ paymentMethodId: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {domainOptions(payments.data)}
                </Select>
              </Field>
              <Field optional label="Vencimento (dia)" htmlFor="s-due">
                <Select
                  id="s-due"
                  value={form.dueDay}
                  onChange={(e) => set({ dueDay: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {[5, 10, 15, 20].map((day) => (
                    <option key={day} value={day}>
                      Dia {day}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {isDebit ? <DirectDebitFields value={form} onChange={set} /> : null}
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Agendamento</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field optional label="Dia do agendamento" htmlFor="s-schedule-date">
                <Input
                  id="s-schedule-date"
                  type="date"
                  min="1900-01-01"
                  max="2100-12-31"
                  value={form.scheduleDate}
                  onChange={(e) => set({ scheduleDate: e.target.value })}
                />
              </Field>
              <Field optional label="Período" htmlFor="s-schedule-period">
                <Select
                  id="s-schedule-period"
                  value={form.schedulePeriodId}
                  onChange={(e) => set({ schedulePeriodId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {domainOptions(schedulePeriods.data)}
                </Select>
              </Field>
              <Field optional label="Data da instalação" htmlFor="s-installed">
                {showInstalledAt ? (
                  <Input
                    id="s-installed"
                    type="date"
                    min="1900-01-01"
                    max="2100-12-31"
                    autoFocus={!form.installedAt}
                    value={form.installedAt}
                    onChange={(e) => set({ installedAt: e.target.value })}
                  />
                ) : (
                  <button
                    id="s-installed"
                    type="button"
                    onClick={() => setShowInstalledAt(true)}
                    className="flex h-10 w-full items-center gap-2 rounded-md border border-dashed border-default px-3 text-body text-secondary transition-colors hover:border-strong hover:text-primary"
                  >
                    <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
                    Adicionar data
                  </button>
                )}
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Observações</h3>
            <Field optional label="Observações" htmlFor="s-notes">
              <Textarea
                id="s-notes"
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Field>
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Operacional</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field optional label="Login" htmlFor="s-login">
                <Input
                  id="s-login"
                  disabled={!canEditLocked}
                  value={form.login}
                  onChange={(e) => set({ login: e.target.value })}
                />
              </Field>
              <Field optional label="Mailing" htmlFor="s-mailing">
                <Select
                  id="s-mailing"
                  value={form.mailingId}
                  onChange={(e) => set({ mailingId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {domainOptions(mailings.data)}
                </Select>
              </Field>
              <Field optional label="Ordem de venda" htmlFor="s-order">
                <Input
                  id="s-order"
                  value={form.orderNumber}
                  onChange={(e) => set({ orderNumber: e.target.value })}
                />
              </Field>
            </div>
            {mode === "create" ? (
              <Checkbox
                checked={form.brscan}
                onChange={(brscan) => set({ brscan })}
                label="CPF validado no BRScan"
              />
            ) : null}
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Pessoas</h3>
            <div className="grid grid-cols-2 gap-4">
              {canChangeSeller ? (
                <Field label="Vendedor" htmlFor="s-seller">
                  <Select
                    id="s-seller"
                    value={form.sellerId}
                    onChange={(e) => set({ sellerId: e.target.value })}
                  >
                    {userOptions(users.data)}
                  </Select>
                </Field>
              ) : null}
              <Field optional label="Supervisor" htmlFor="s-supervisor">
                <Select
                  id="s-supervisor"
                  value={form.supervisorId}
                  onChange={(e) => set({ supervisorId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {userOptions(users.data)}
                </Select>
              </Field>
              <Field optional label="Auditor" htmlFor="s-auditor">
                <Select
                  id="s-auditor"
                  value={form.auditorId}
                  onChange={(e) => set({ auditorId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {userOptions(users.data)}
                </Select>
              </Field>
              <Field optional label="BKO" htmlFor="s-bko">
                <Select
                  id="s-bko"
                  value={form.bkoId}
                  onChange={(e) => set({ bkoId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {userOptions(users.data)}
                </Select>
              </Field>
            </div>
          </section>

          {mode === "create" ? (
            <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
              <h3 className="text-h3 text-primary">Anexos</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field optional label="Áudio da venda" htmlFor="s-audio">
                  <FilePicker
                    id="s-audio"
                    accept={AUDIO_ACCEPT}
                    file={audioFile}
                    onChange={setAudioFile}
                  />
                </Field>
                <Field optional label="Comprovante de endereço" htmlFor="s-proof">
                  <FilePicker
                    id="s-proof"
                    accept={DOCUMENT_ACCEPT}
                    file={proofOfAddressFile}
                    onChange={setProofOfAddressFile}
                  />
                </Field>
              </div>
              <p className="text-caption text-muted">
                Os arquivos são enviados depois que a venda for salva.
              </p>
            </section>
          ) : null}
        </div>

        <div className="sticky top-0 flex flex-col gap-6">
          {mode === "create" ? (
            <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
              <h3 className="text-h3 text-primary">Status</h3>
              <Field label="Status da venda" htmlFor="s-status">
                <Select
                  id="s-status"
                  value={form.statusId}
                  onChange={(e) => set({ statusId: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {domainOptions(statuses.data)}
                </Select>
              </Field>
            </section>
          ) : null}
          <PlanPanel plan={pricingPlan} />
          {mode === "create" ? (
            <>
              <SaleSummary
                amount={form.amount}
                dueDay={form.dueDay}
                paymentLabel={selectedPayment?.value ?? null}
                sellerName={
                  (users.data ?? []).find((row) => row.id === form.sellerId)?.name ??
                  user?.name ??
                  null
                }
                priceMin={pricingPlan ? priceMin : null}
                priceMax={pricingPlan ? priceMax : null}
              />
              <SaleChecklist
                brscan={form.brscan}
                audioAttached={audioFile !== null}
                proofOfAddressAttached={proofOfAddressFile !== null}
                payment={!form.paymentMethodId ? "none" : isDebit ? "debit" : "boleto"}
                bankDataComplete={bankDataComplete}
              />
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-caption text-danger">{error}</p> : null}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => onDone(sale?.id ?? "")}>
          Cancelar
        </Button>
        <Button loading={mutation.isPending || uploadAttachment.isPending} onClick={onSubmit}>
          {mode === "edit" ? "Salvar alterações" : "Salvar venda"}
        </Button>
      </div>
    </div>
  );
}

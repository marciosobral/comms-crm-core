import { AddressFields, AddressSummary } from "@/components/customers/address-fields";
import { Button, Checkbox, Field, Input, MaskedInput, Select, Textarea } from "@/components/ui";
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
  formatAddressOption,
  isAddressFormEmpty,
} from "@/lib/address";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import type {
  Address,
  CustomerInput,
  SaleDetail,
  SalePayload,
  SaleUpdatePayload,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  MESSAGES,
  digitsOnly,
  formatCpfCnpj,
  formatPhone,
  isCep,
  isCpfCnpj,
  isEmail,
  isPhone,
  isUf,
  normalizeEmail,
} from "@comms-core/validation";
import { Repeat } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { customerToSaleFields, emptyCustomerSaleFields } from "./customer-sale-fields";
import { CustomerSearch } from "./customer-search";
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
  const [searchSeed, setSearchSeed] = useState("");
  const [searchNonce, setSearchNonce] = useState(0);
  const [catalogAddresses, setCatalogAddresses] = useState<Address[]>([]);
  const [customerAddressId, setCustomerAddressId] = useState("new");
  const [addressDraft, setAddressDraft] = useState(() => emptyAddressForm());

  const plans = usePlans();
  const statuses = useActiveDomainValues("SALE_STATUS");
  const payments = useActiveDomainValues("PAYMENT_METHOD");
  const systems = useActiveDomainValues("SYSTEM");
  const mailings = useActiveDomainValues("MAILING");
  const pdvs = useActiveDomainValues("PDV");
  const users = useUsers();

  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const mutation = mode === "edit" ? updateSale : createSale;

  const [form, setForm] = useState(() => ({
    customerName: sale?.customer.name ?? "",
    customerCpfCnpj: sale?.customer.cpfCnpj ? formatCpfCnpj(sale.customer.cpfCnpj) : "",
    customerBirthDate: sale?.customer.birthDate?.slice(0, 10) ?? "",
    customerMotherName: sale?.customer.motherName ?? "",
    customerEmail: sale?.customer.email ?? "",
    customerPhone1: sale?.customer.phone1 ? formatPhone(sale.customer.phone1) : "",
    customerPhone2: sale?.customer.phone2 ? formatPhone(sale.customer.phone2) : "",
    internetPlanId: sale?.internetPlan?.id ?? "",
    fixedPlanId: sale?.fixedPlan?.id ?? "",
    statusId: sale?.status.id ?? "",
    paymentMethodId: sale?.paymentMethod?.id ?? "",
    systemId: sale?.system?.id ?? "",
    mailingId: sale?.mailing?.id ?? "",
    pdvId: sale?.pdv?.id ?? "",
    amount: sale ? Number(sale.amount) : 0,
    qty: sale?.qty ?? 1,
    dueDay: sale?.dueDay ? String(sale.dueDay) : "",
    date: sale?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    orderNumber: sale?.orderNumber ?? "",
    login: sale?.login ?? "",
    notes: sale?.notes ?? "",
    brscan: sale?.brscan ?? false,
    bankAgency: sale?.bankAgency ?? "",
    bankAccount: sale?.bankAccount ?? "",
    bankName: sale?.bankName ?? "",
    sellerId: sale?.seller.id ?? "",
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

  const pricingPlan = useMemo(() => {
    const id = form.internetPlanId || form.fixedPlanId;
    return (plans.data ?? []).find((plan) => plan.id === id) ?? null;
  }, [plans.data, form.internetPlanId, form.fixedPlanId]);

  const selectedPayment = (payments.data ?? []).find((p) => p.id === form.paymentMethodId);
  const isDebit = (selectedPayment?.value ?? "").toUpperCase().includes("DÉBITO");

  const priceMin = pricingPlan ? Number(pricingPlan.minPrice) : 0;
  const priceMax = pricingPlan ? Number(pricingPlan.basePrice) : 0;

  const onPlanChange = (patch: { internetPlanId?: string; fixedPlanId?: string }) => {
    const nextInternet = patch.internetPlanId ?? form.internetPlanId;
    const nextFixed = patch.fixedPlanId ?? form.fixedPlanId;
    const nextPlan = (plans.data ?? []).find((p) => p.id === (nextInternet || nextFixed));
    set({ ...patch, amount: nextPlan ? Number(nextPlan.basePrice) : 0 });
  };

  const onSubmit = () => {
    setError("");
    setFieldErrors({});
    if (!form.statusId || !pricingPlan || !form.date) {
      setError("Preencha plano, status e data");
      return;
    }

    if (mode === "create") {
      if (canViewCustomers && customerSource === "existing" && !existingSelected) {
        setError("Selecione um cliente");
        return;
      }
      const doc = digitsOnly(form.customerCpfCnpj);
      const nextFieldErrors: CustomerFieldErrors = {};

      if (!isCpfCnpj(doc)) {
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

    const common = {
      fixedPlanId: form.fixedPlanId || undefined,
      internetPlanId: form.internetPlanId || undefined,
      paymentMethodId: form.paymentMethodId || undefined,
      systemId: form.systemId || undefined,
      mailingId: form.mailingId || undefined,
      pdvId: form.pdvId || undefined,
      amount: form.amount,
      qty: form.qty,
      dueDay: form.dueDay ? Number(form.dueDay) : undefined,
      date: form.date,
      orderNumber: form.orderNumber || undefined,
      login: form.login || undefined,
      notes: form.notes || undefined,
      brscan: form.brscan,
      bankAgency: form.bankAgency ? digitsOnly(form.bankAgency) : undefined,
      bankAccount: form.bankAccount ? digitsOnly(form.bankAccount) : undefined,
      bankName: form.bankName || undefined,
    };

    const onSuccess = (result: { id: string }) => onDone(result.id);
    const onError = (err: unknown) =>
      setError(err instanceof ApiError ? err.message : "Erro ao salvar venda");

    if (mode === "edit" && sale) {
      const payload: SaleUpdatePayload & { id: string } = { id: sale.id, ...common };
      updateSale.mutate(payload, { onSuccess, onError });
    } else {
      const customer: CustomerInput = {
        name: form.customerName,
        cpfCnpj: digitsOnly(form.customerCpfCnpj),
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
        customer,
      };
      createSale.mutate(payload, { onSuccess, onError });
    }
  };

  const domainOptions = (rows: { id: string; value: string }[] | undefined) =>
    (rows ?? []).map((row) => (
      <option key={row.id} value={row.id}>
        {row.value}
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
                            {form.customerCpfCnpj || "Cliente selecionado"}
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
                          setFieldErrors({});
                          set(emptyCustomerSaleFields());
                          resetAddress();
                        }}
                      >
                        Trocar
                      </Button>
                    </div>
                    {form.customerBirthDate || form.customerMotherName ? (
                      <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-subtle pt-4">
                        {form.customerBirthDate ? (
                          <div className="flex min-w-0 flex-col gap-1">
                            <dt className="text-caption text-muted">Data de nascimento</dt>
                            <dd className="text-body text-primary">
                              {formatDate(form.customerBirthDate)}
                            </dd>
                          </div>
                        ) : null}
                        {form.customerMotherName ? (
                          <div className="flex min-w-0 flex-col gap-1">
                            <dt className="text-caption text-muted">Nome da mãe</dt>
                            <dd className="text-body text-primary">{form.customerMotherName}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : null}
                    <div className="grid grid-cols-3 gap-4 border-t border-subtle pt-4">
                      <Field label="E-mail" htmlFor="c-email" error={fieldErrors.customerEmail}>
                        <Input
                          id="c-email"
                          type="email"
                          value={form.customerEmail}
                          onChange={(e) => set({ customerEmail: e.target.value })}
                        />
                      </Field>
                      <Field
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
                    <Field label="Data de nascimento" htmlFor="c-birth">
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
                      <Field label="Nome da mãe" htmlFor="c-mother">
                        <Input
                          id="c-mother"
                          value={form.customerMotherName}
                          onChange={(e) => set({ customerMotherName: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="E-mail" htmlFor="c-email" error={fieldErrors.customerEmail}>
                      <Input
                        id="c-email"
                        type="email"
                        value={form.customerEmail}
                        onChange={(e) => set({ customerEmail: e.target.value })}
                      />
                    </Field>
                    <Field label="Contato 1" htmlFor="c-phone1" error={fieldErrors.customerPhone1}>
                      <MaskedInput
                        id="c-phone1"
                        mask="phone"
                        placeholder="(62) 90000-0000"
                        value={form.customerPhone1}
                        onChange={(value) => set({ customerPhone1: value })}
                      />
                    </Field>
                    <Field label="Contato 2" htmlFor="c-phone2" error={fieldErrors.customerPhone2}>
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
                    <Field label="Endereço do cadastro" htmlFor="c-address-pick">
                      <Select
                        id="c-address-pick"
                        value={customerAddressId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          if (nextId === "new") {
                            setCustomerAddressId("new");
                            setAddressDraft(emptyAddressForm());
                            return;
                          }
                          applyCatalogAddress(catalogAddresses, nextId);
                        }}
                      >
                        {catalogAddresses.map((item) => (
                          <option key={item.id} value={item.id}>
                            {formatAddressOption(item)}
                          </option>
                        ))}
                        <option value="new">Novo endereço</option>
                      </Select>
                    </Field>
                  ) : null}
                  {customerSource === "existing" && customerAddressId !== "new" ? (
                    <AddressSummary
                      address={catalogAddresses.find((item) => item.id === customerAddressId)}
                    />
                  ) : (
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
              <Field label="Plano internet" htmlFor="s-internet">
                <Select
                  id="s-internet"
                  value={form.internetPlanId}
                  onChange={(e) => onPlanChange({ internetPlanId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {(plans.data ?? [])
                    .filter((p) => p.active)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Plano fixo" htmlFor="s-fixed">
                <Select
                  id="s-fixed"
                  value={form.fixedPlanId}
                  onChange={(e) => onPlanChange({ fixedPlanId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {(plans.data ?? [])
                    .filter((p) => p.active)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Quantidade" htmlFor="s-qty">
                <Input
                  id="s-qty"
                  type="number"
                  min={1}
                  value={form.qty}
                  onChange={(e) => set({ qty: Number(e.target.value) || 1 })}
                />
              </Field>
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
              {mode === "create" ? (
                <Field label="Status" htmlFor="s-status">
                  <Select
                    id="s-status"
                    value={form.statusId}
                    onChange={(e) => set({ statusId: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {domainOptions(statuses.data)}
                  </Select>
                </Field>
              ) : null}
              <Field label="Vencimento (dia)" htmlFor="s-due">
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
              <Field label="Sistema" htmlFor="s-system">
                <Select
                  id="s-system"
                  value={form.systemId}
                  onChange={(e) => set({ systemId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {domainOptions(systems.data)}
                </Select>
              </Field>
              <Field label="Mailing" htmlFor="s-mailing">
                <Select
                  id="s-mailing"
                  value={form.mailingId}
                  onChange={(e) => set({ mailingId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {domainOptions(mailings.data)}
                </Select>
              </Field>
              <Field label="Forma de pagamento" htmlFor="s-payment">
                <Select
                  id="s-payment"
                  value={form.paymentMethodId}
                  onChange={(e) => set({ paymentMethodId: e.target.value })}
                >
                  <option value="">Nenhuma</option>
                  {domainOptions(payments.data)}
                </Select>
              </Field>
            </div>

            {isDebit ? (
              <div className="flex flex-col gap-4 border-t border-subtle pt-4">
                <span className="text-eyebrow uppercase tracking-wide text-muted">
                  Dados bancários - débito automático
                </span>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Banco" htmlFor="s-bank">
                    <Input
                      id="s-bank"
                      value={form.bankName}
                      onChange={(e) => set({ bankName: e.target.value })}
                    />
                  </Field>
                  <Field label="Agência" htmlFor="s-agency">
                    <Input
                      id="s-agency"
                      value={form.bankAgency}
                      onChange={(e) => set({ bankAgency: digitsOnly(e.target.value) })}
                    />
                  </Field>
                  <Field label="Conta" htmlFor="s-account">
                    <Input
                      id="s-account"
                      value={form.bankAccount}
                      onChange={(e) => set({ bankAccount: digitsOnly(e.target.value) })}
                    />
                  </Field>
                </div>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Operação e origem</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="PDV" htmlFor="s-pdv">
                <Select
                  id="s-pdv"
                  disabled={!canEditLocked}
                  value={form.pdvId}
                  onChange={(e) => set({ pdvId: e.target.value })}
                >
                  <option value="">Padrão</option>
                  {domainOptions(pdvs.data)}
                </Select>
              </Field>
              <Field label="Login" htmlFor="s-login">
                <Input
                  id="s-login"
                  disabled={!canEditLocked}
                  value={form.login}
                  onChange={(e) => set({ login: e.target.value })}
                />
              </Field>
              {canChangeSeller ? (
                <Field label="Vendedor" htmlFor="s-seller">
                  <Select
                    id="s-seller"
                    value={form.sellerId}
                    onChange={(e) => set({ sellerId: e.target.value })}
                  >
                    {(users.data ?? []).map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label="Ordem de venda" htmlFor="s-order">
                <Input
                  id="s-order"
                  value={form.orderNumber}
                  onChange={(e) => set({ orderNumber: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Observações" htmlFor="s-notes">
              <Textarea
                id="s-notes"
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Field>
            {mode === "edit" ? (
              <Checkbox
                checked={form.brscan}
                onChange={(brscan) => set({ brscan })}
                label="CPF validado no BRScan"
              />
            ) : null}
          </section>
        </div>

        <div className="sticky top-0 flex flex-col gap-6">
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
                onBrscanChange={(brscan) => set({ brscan })}
                bankDataConfirmed={
                  !isDebit ||
                  Boolean(form.bankName.trim() && form.bankAgency.trim() && form.bankAccount.trim())
                }
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
        <Button loading={mutation.isPending} onClick={onSubmit}>
          {mode === "edit" ? "Salvar alterações" : "Salvar venda"}
        </Button>
      </div>
    </div>
  );
}

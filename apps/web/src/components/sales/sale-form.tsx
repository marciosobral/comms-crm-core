import { Button, Checkbox, Field, Input, MaskedInput, Select, Textarea } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { usePlans } from "@/hooks/use-plans";
import { useCreateSale, useUpdateSale } from "@/hooks/use-sales";
import { useUsers } from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import type { SaleDetail, SalePayload, SaleUpdatePayload } from "@/lib/types";
import {
  digitsOnly,
  formatCpfCnpj,
  formatPhone,
  isCpfCnpj,
  isEmail,
  isPhone,
  isUf,
  MESSAGES,
  normalizeEmail,
  normalizeUf,
} from "@comms-core/validation";
import { useEffect, useMemo, useState } from "react";
import { PlanPanel } from "./plan-panel";
import { PriceSlider } from "./price-slider";
import { SaleChecklist } from "./sale-checklist";
import { SaleSummary } from "./sale-summary";

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
  customerState: string;
}>;

export function SaleForm({ mode, sale, onDone }: SaleFormProps) {
  const { user } = useCurrentUser();
  const subject = user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null;
  const canEditLocked = hasPermission(subject, "sales.edit_locked_fields");
  const canChangeSeller = hasPermission(subject, "sales.change_seller");

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
    customerAddress: sale?.customer.address ?? "",
    customerCity: sale?.customer.city ?? "",
    customerState: sale?.customer.state ?? "",
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
      if (form.customerState && !isUf(form.customerState)) {
        nextFieldErrors.customerState = MESSAGES.uf;
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
      const payload: SalePayload = {
        ...common,
        statusId: form.statusId,
        sellerId: canChangeSeller ? form.sellerId || undefined : undefined,
        customer: {
          name: form.customerName,
          cpfCnpj: digitsOnly(form.customerCpfCnpj),
          birthDate: form.customerBirthDate || undefined,
          motherName: form.customerMotherName || undefined,
          address: form.customerAddress || undefined,
          city: form.customerCity || undefined,
          state: form.customerState ? normalizeUf(form.customerState) : undefined,
          email: form.customerEmail ? normalizeEmail(form.customerEmail) : undefined,
          phone1: form.customerPhone1 ? digitsOnly(form.customerPhone1) : undefined,
          phone2: form.customerPhone2 ? digitsOnly(form.customerPhone2) : undefined,
        },
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
    <div className="grid grid-cols-[1fr_360px] items-start gap-6">
      <div className="flex flex-col gap-6">
        {mode === "create" ? (
          <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
            <h3 className="text-h3 text-primary">Dados do cliente</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Nome / Razão social" htmlFor="c-name">
                <Input
                  id="c-name"
                  value={form.customerName}
                  onChange={(e) => set({ customerName: e.target.value })}
                />
              </Field>
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
              <Field label="Nome da mãe" htmlFor="c-mother">
                <Input
                  id="c-mother"
                  value={form.customerMotherName}
                  onChange={(e) => set({ customerMotherName: e.target.value })}
                />
              </Field>
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
              <Field label="Endereço" htmlFor="c-address">
                <Input
                  id="c-address"
                  value={form.customerAddress}
                  onChange={(e) => set({ customerAddress: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <Field label="Cidade" htmlFor="c-city">
                  <Input
                    id="c-city"
                    value={form.customerCity}
                    onChange={(e) => set({ customerCity: e.target.value })}
                  />
                </Field>
                <Field label="UF" htmlFor="c-state" error={fieldErrors.customerState}>
                  <Input
                    id="c-state"
                    maxLength={2}
                    value={form.customerState}
                    onChange={(e) => set({ customerState: e.target.value.toUpperCase() })}
                  />
                </Field>
              </div>
            </div>
          </section>
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

      <div className="flex flex-col gap-6">
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
  );
}

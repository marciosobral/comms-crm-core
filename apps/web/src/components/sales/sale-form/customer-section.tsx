import { Button, Field, Input, MaskedInput } from "@/components/ui";
import { CUSTOMER_SOURCE_TABS, type CustomerSource } from "@/hooks/use-sale-form";
import { formatDate } from "@/lib/format";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import type { Customer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Repeat } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";
import { CustomerSearch } from "../customer-search";

function customerInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CustomerSection({
  canViewCustomers,
  customerSource,
  existingSelected,
  searchSeed,
  searchNonce,
  onSwitchCustomerSource,
  onSelectExistingCustomer,
  onSwitchCustomer,
}: {
  canViewCustomers: boolean;
  customerSource: CustomerSource;
  existingSelected: boolean;
  searchSeed: string;
  searchNonce: number;
  onSwitchCustomerSource: (source: CustomerSource) => void;
  onSelectExistingCustomer: (customer: Customer) => void;
  onSwitchCustomer: () => void;
}) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<SaleFormValues>();
  const customerName = watch("customerName");
  const customerCpfCnpj = watch("customerCpfCnpj");
  const customerBirthDate = watch("customerBirthDate");
  const customerMotherName = watch("customerMotherName");

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-h3 text-primary">Dados do cliente</h3>
        {canViewCustomers ? (
          <div className="inline-flex shrink-0 gap-1 rounded-[10px] border border-default bg-elevated p-1">
            {CUSTOMER_SOURCE_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSwitchCustomerSource(item.id)}
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
          onSelect={onSelectExistingCustomer}
        />
      ) : null}
      {customerSource === "existing" && existingSelected ? (
        <div className="flex flex-col gap-4 rounded-lg border border-default bg-elevated p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-caption text-accent">
                {customerInitials(customerName) || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-h3 text-primary">{customerName || "-"}</p>
                <p className="mt-0.5 truncate text-caption text-muted">
                  {[
                    customerCpfCnpj,
                    customerBirthDate ? `Nasc. ${formatDate(customerBirthDate)}` : null,
                    customerMotherName ? `Mãe: ${customerMotherName}` : null,
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
              onClick={onSwitchCustomer}
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
                error={errors.customerEmail?.message}
              >
                <Input id="c-email" type="email" {...register("customerEmail")} />
              </Field>
              <Field
                optional
                label="Contato 1"
                htmlFor="c-phone1"
                error={errors.customerPhone1?.message}
              >
                <Controller
                  name="customerPhone1"
                  control={control}
                  render={({ field }) => (
                    <MaskedInput
                      id="c-phone1"
                      mask="phone"
                      placeholder="(62) 90000-0000"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
              <Field
                optional
                label="Contato 2"
                htmlFor="c-phone2"
                error={errors.customerPhone2?.message}
              >
                <Controller
                  name="customerPhone2"
                  control={control}
                  render={({ field }) => (
                    <MaskedInput
                      id="c-phone2"
                      mask="phone"
                      placeholder="(62) 90000-0000"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
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
              <Input id="c-name" {...register("customerName")} />
            </Field>
          </div>
          <Field label="CPF/CNPJ" htmlFor="c-doc" error={errors.customerCpfCnpj?.message}>
            <Controller
              name="customerCpfCnpj"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  id="c-doc"
                  mask="cpfCnpj"
                  placeholder="000.000.000-00"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
          <Field optional label="Data de nascimento" htmlFor="c-birth">
            <Input
              id="c-birth"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              {...register("customerBirthDate")}
            />
          </Field>
          <div className="col-span-2">
            <Field optional label="Nome da mãe" htmlFor="c-mother">
              <Input id="c-mother" {...register("customerMotherName")} />
            </Field>
          </div>
          <Field optional label="E-mail" htmlFor="c-email" error={errors.customerEmail?.message}>
            <Input id="c-email" type="email" {...register("customerEmail")} />
          </Field>
          <Field
            optional
            label="Contato 1"
            htmlFor="c-phone1"
            error={errors.customerPhone1?.message}
          >
            <Controller
              name="customerPhone1"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  id="c-phone1"
                  mask="phone"
                  placeholder="(62) 90000-0000"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
          <Field
            optional
            label="Contato 2"
            htmlFor="c-phone2"
            error={errors.customerPhone2?.message}
          >
            <Controller
              name="customerPhone2"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  id="c-phone2"
                  mask="phone"
                  placeholder="(62) 90000-0000"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        </div>
      ) : null}
    </section>
  );
}

import { AddressFields } from "@/components/customers/address-fields";
import { Button, Field, Input, MaskedInput, Modal } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import {
  addressToForm,
  emptyAddressForm,
  formToAddressPayload,
  isAddressFormEmpty,
} from "@/lib/address";
import { ApiError } from "@/lib/api";
import { type CustomerFormValues, customerFormSchemaForEdit } from "@/lib/form-schemas";
import { hasPermission } from "@/lib/permissions";
import type { Customer, CustomerPayload } from "@/lib/types";
import {
  digitsOnly,
  formatDisplayCpfCnpj,
  formatPhone,
  normalizeEmail,
} from "@comms-crm-core/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

export function CustomerFormModal({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const mutation = customer ? updateCustomer : createCustomer;
  const { user } = useCurrentUser();
  const subject = user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null;
  const canViewDocument = hasPermission(subject, "customers.view_document");
  const documentLocked = Boolean(customer) && !canViewDocument;
  const schema = useMemo(() => customerFormSchemaForEdit({ documentLocked }), [documentLocked]);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? {
          name: customer.name,
          cpfCnpj: formatDisplayCpfCnpj(customer.cpfCnpj),
          birthDate: customer.birthDate?.slice(0, 10) ?? "",
          motherName: customer.motherName ?? "",
          email: customer.email ?? "",
          phone1: customer.phone1 ? formatPhone(customer.phone1) : "",
          phone2: customer.phone2 ? formatPhone(customer.phone2) : "",
          addresses: customer.addresses?.length
            ? customer.addresses.map(addressToForm)
            : [emptyAddressForm(true)],
        }
      : {
          name: "",
          cpfCnpj: "",
          birthDate: "",
          motherName: "",
          email: "",
          phone1: "",
          phone2: "",
          addresses: [emptyAddressForm(true)],
        },
  });

  const isEdit = customer !== null;
  const { fields, append, replace } = useFieldArray({ control, name: "addresses" });
  const addresses = watch("addresses");
  const lastAddressRef = useRef<HTMLDivElement | null>(null);
  const addressListRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToLast = useRef(false);

  useEffect(() => {
    if (!shouldScrollToLast.current || fields.length === 0) return;
    shouldScrollToLast.current = false;
    const container = addressListRef.current;
    const target = lastAddressRef.current;
    if (!container || !target) return;
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTo({ top, behavior: "smooth" });
  }, [fields]);

  const patchAddress = (index: number, patch: Partial<CustomerFormValues["addresses"][number]>) => {
    const current = getValues(`addresses.${index}`);
    const next = { ...current, ...patch };
    if (patch.isDefault) {
      const list = getValues("addresses").map((item, i) => ({
        ...item,
        ...(i === index ? next : { isDefault: false }),
      }));
      replace(list);
      return;
    }
    setValue(`addresses.${index}`, next, { shouldValidate: true });
  };

  const onSubmit = handleSubmit((values) => {
    const payload: CustomerPayload = {
      name: values.name,
      birthDate: values.birthDate || undefined,
      motherName: values.motherName.trim() || undefined,
      email: normalizeEmail(values.email) || undefined,
      phone1: digitsOnly(values.phone1) || undefined,
      phone2: digitsOnly(values.phone2) || undefined,
      addresses: values.addresses
        .filter((item) => !isAddressFormEmpty(item))
        .map(formToAddressPayload),
    };
    if (!documentLocked) {
      payload.cpfCnpj = digitsOnly(values.cpfCnpj);
    }
    if (customer) {
      updateCustomer.mutate({ id: customer.id, ...payload }, { onSuccess: onClose });
    } else {
      createCustomer.mutate(payload, { onSuccess: onClose });
    }
  });

  const apiError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <Modal
      open
      size="lg"
      title={customer ? "Editar cliente" : "Novo Cliente"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <div ref={addressListRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Field label="Nome / Razão social" htmlFor="cust-name" error={errors.name?.message}>
          <Input id="cust-name" {...register("name")} />
        </Field>

        <Field label="CPF / CNPJ" htmlFor="cust-doc" error={errors.cpfCnpj?.message}>
          {documentLocked ? (
            <Input id="cust-doc" value={formatDisplayCpfCnpj(customer?.cpfCnpj ?? "")} readOnly />
          ) : (
            <Controller
              name="cpfCnpj"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  id="cust-doc"
                  mask="cpfCnpj"
                  placeholder="000.000.000-00"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            optional
            label="Data de nascimento"
            htmlFor="cust-birth"
            error={errors.birthDate?.message}
          >
            <Input
              id="cust-birth"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              {...register("birthDate")}
            />
          </Field>
          <Field
            optional
            label="Nome da mãe"
            htmlFor="cust-mother"
            error={errors.motherName?.message}
          >
            <Input id="cust-mother" {...register("motherName")} />
          </Field>
        </div>

        <Field optional label="E-mail" htmlFor="cust-email" error={errors.email?.message}>
          <Input id="cust-email" type="email" {...register("email")} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field optional label="Contato 1" htmlFor="cust-phone1" error={errors.phone1?.message}>
            <Controller
              name="phone1"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  id="cust-phone1"
                  mask="phone"
                  placeholder="(62) 90000-0000"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </Field>
          <Field optional label="Contato 2" htmlFor="cust-phone2" error={errors.phone2?.message}>
            <Controller
              name="phone2"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  id="cust-phone2"
                  mask="phone"
                  placeholder="(62) 90000-0000"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-h3 text-primary">{isEdit ? "Endereços" : "Endereço"}</h3>
          {isEdit ? (
            <Button
              variant="secondary"
              icon={Plus}
              className="h-8 px-3 text-small"
              onClick={() => {
                shouldScrollToLast.current = true;
                append(emptyAddressForm(addresses.length === 0));
              }}
            >
              Adicionar
            </Button>
          ) : null}
        </div>

        {isEdit && fields.length === 0 ? (
          <p className="text-body text-secondary">Nenhum endereço. Adicione um para o cadastro.</p>
        ) : null}

        {fields.map((field, index) => (
          <div
            key={field.id}
            ref={index === fields.length - 1 ? lastAddressRef : undefined}
            className="flex flex-col gap-4 rounded-lg border border-default p-4"
          >
            {isEdit ? (
              <span className="text-small text-secondary">Endereço {index + 1}</span>
            ) : null}
            <AddressFields
              idPrefix={`cust-addr-${index}`}
              value={addresses[index] ?? emptyAddressForm()}
              showDefault={isEdit}
              onChange={(patch) => patchAddress(index, patch)}
              errors={{
                postalCode: errors.addresses?.[index]?.postalCode?.message,
                street: errors.addresses?.[index]?.street?.message,
                number: errors.addresses?.[index]?.number?.message,
                complement: errors.addresses?.[index]?.complement?.message,
                neighborhood: errors.addresses?.[index]?.neighborhood?.message,
                city: errors.addresses?.[index]?.city?.message,
                state: errors.addresses?.[index]?.state?.message,
              }}
            />
          </div>
        ))}

        {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
      </div>
    </Modal>
  );
}

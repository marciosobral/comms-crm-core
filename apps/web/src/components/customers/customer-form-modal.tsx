import { Button, Field, Input, MaskedInput, Modal } from "@/components/ui";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import { ApiError } from "@/lib/api";
import { type CustomerFormValues, customerFormSchema } from "@/lib/form-schemas";
import type { Customer, CustomerPayload } from "@/lib/types";
import {
  digitsOnly,
  formatCpfCnpj,
  formatPhone,
  normalizeEmail,
  normalizeUf,
} from "@comms-core/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

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

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customer
      ? {
          name: customer.name,
          cpfCnpj: formatCpfCnpj(customer.cpfCnpj),
          birthDate: customer.birthDate?.slice(0, 10) ?? "",
          motherName: customer.motherName ?? "",
          email: customer.email ?? "",
          phone1: customer.phone1 ? formatPhone(customer.phone1) : "",
          phone2: customer.phone2 ? formatPhone(customer.phone2) : "",
          address: customer.address ?? "",
          city: customer.city ?? "",
          state: customer.state ?? "",
        }
      : {
          name: "",
          cpfCnpj: "",
          birthDate: "",
          motherName: "",
          email: "",
          phone1: "",
          phone2: "",
          address: "",
          city: "",
          state: "",
        },
  });

  const onSubmit = handleSubmit((values) => {
    const payload: CustomerPayload = {
      name: values.name,
      cpfCnpj: digitsOnly(values.cpfCnpj),
      birthDate: values.birthDate || undefined,
      motherName: values.motherName.trim() || undefined,
      email: normalizeEmail(values.email) || undefined,
      phone1: digitsOnly(values.phone1) || undefined,
      phone2: digitsOnly(values.phone2) || undefined,
      address: values.address.trim() || undefined,
      city: values.city.trim() || undefined,
      state: normalizeUf(values.state) || undefined,
    };
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
      <Field label="Nome / Razão social" htmlFor="cust-name" error={errors.name?.message}>
        <Input id="cust-name" {...register("name")} />
      </Field>

      <Field label="CPF / CNPJ" htmlFor="cust-doc" error={errors.cpfCnpj?.message}>
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
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data de nascimento" htmlFor="cust-birth" error={errors.birthDate?.message}>
          <Input id="cust-birth" type="date" min="1900-01-01" max="2100-12-31" {...register("birthDate")} />
        </Field>
        <Field label="Nome da mãe" htmlFor="cust-mother" error={errors.motherName?.message}>
          <Input id="cust-mother" {...register("motherName")} />
        </Field>
      </div>

      <Field label="E-mail" htmlFor="cust-email" error={errors.email?.message}>
        <Input id="cust-email" type="email" {...register("email")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Contato 1" htmlFor="cust-phone1" error={errors.phone1?.message}>
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
        <Field label="Contato 2" htmlFor="cust-phone2" error={errors.phone2?.message}>
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

      <Field label="Endereço" htmlFor="cust-address" error={errors.address?.message}>
        <Input id="cust-address" {...register("address")} />
      </Field>

      <div className="grid grid-cols-[1fr_80px] gap-4">
        <Field label="Cidade" htmlFor="cust-city" error={errors.city?.message}>
          <Input id="cust-city" {...register("city")} />
        </Field>
        <Field label="UF" htmlFor="cust-state" error={errors.state?.message}>
          <Input id="cust-state" maxLength={2} {...register("state")} />
        </Field>
      </div>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

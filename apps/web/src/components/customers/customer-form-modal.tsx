import { Button, Field, Input, Modal } from "@/components/ui";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import { ApiError } from "@/lib/api";
import type { Customer, CustomerPayload } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Informe o nome"),
  cpfCnpj: z.string().min(1, "Informe o CPF ou CNPJ"),
  birthDate: z.string(),
  motherName: z.string(),
  email: z.string().email("E-mail inválido").or(z.literal("")),
  phone1: z.string(),
  phone2: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
});

type CustomerFormValues = z.infer<typeof schema>;

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
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? {
          name: customer.name,
          cpfCnpj: customer.cpfCnpj,
          birthDate: customer.birthDate?.slice(0, 10) ?? "",
          motherName: customer.motherName ?? "",
          email: customer.email ?? "",
          phone1: customer.phone1 ?? "",
          phone2: customer.phone2 ?? "",
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
      cpfCnpj: values.cpfCnpj,
      birthDate: values.birthDate || undefined,
      motherName: values.motherName.trim() || undefined,
      email: values.email.trim() || undefined,
      phone1: values.phone1.trim() || undefined,
      phone2: values.phone2.trim() || undefined,
      address: values.address.trim() || undefined,
      city: values.city.trim() || undefined,
      state: values.state.trim() || undefined,
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
        <Input id="cust-doc" placeholder="000.000.000-00" {...register("cpfCnpj")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data de nascimento" htmlFor="cust-birth" error={errors.birthDate?.message}>
          <Input id="cust-birth" type="date" {...register("birthDate")} />
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
          <Input id="cust-phone1" placeholder="(62) 90000-0000" {...register("phone1")} />
        </Field>
        <Field label="Contato 2" htmlFor="cust-phone2" error={errors.phone2?.message}>
          <Input id="cust-phone2" placeholder="(62) 90000-0000" {...register("phone2")} />
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

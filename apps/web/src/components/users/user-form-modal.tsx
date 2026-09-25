import { Button, Field, Input, MaskedInput, Modal, Select } from "@/components/ui";
import { useRoles } from "@/hooks/use-roles";
import { type UserPayload, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import {
  type UserCreateFormValues,
  type UserEditFormValues,
  userCreateSchema,
  userEditSchema,
} from "@/lib/form-schemas";
import type { UserRow } from "@/lib/types";
import { digitsOnly, formatCpf, formatPhone, normalizeEmail } from "@comms-crm-core/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

type UserFormValues = UserCreateFormValues | UserEditFormValues;

export function UserFormModal({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const roles = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const mutation = user ? updateUser : createUser;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(user ? userEditSchema : userCreateSchema),
    defaultValues: user
      ? {
          name: user.name,
          email: user.email,
          cpf: user.cpf ? formatCpf(user.cpf) : "",
          phone: user.phone ? formatPhone(user.phone) : "",
          roleId: user.roleId ?? "",
          reference: user.reference,
          externalReference: user.externalReference ?? "",
          password: "",
          confirmPassword: "",
        }
      : {
          name: "",
          email: "",
          cpf: "",
          phone: "",
          roleId: "",
          reference: "",
          externalReference: "",
          password: "",
          confirmPassword: "",
        },
  });

  const onSubmit = handleSubmit((values) => {
    const payload: UserPayload = {
      name: values.name,
      email: normalizeEmail(values.email),
      cpf: digitsOnly(values.cpf) || undefined,
      phone: digitsOnly(values.phone) || undefined,
      roleId: values.roleId || undefined,
      externalReference: values.externalReference.trim() || (user ? null : undefined),
    };
    if (user) {
      updateUser.mutate({ id: user.id, ...payload }, { onSuccess: onClose });
    } else {
      createUser.mutate(
        { ...payload, password: values.password, reference: values.reference || undefined },
        { onSuccess: onClose },
      );
    }
  });

  const apiError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <Modal
      open
      title={user ? "Editar Usuário" : "Adicionar Usuário"}
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
      <Field label="Nome completo" htmlFor="user-name" error={errors.name?.message}>
        <Input id="user-name" {...register("name")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field optional label="CPF" htmlFor="user-cpf" error={errors.cpf?.message}>
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <MaskedInput
                id="user-cpf"
                mask="cpf"
                placeholder="000.000.000-00"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>
        <Field optional label="Cargo" htmlFor="user-role" error={errors.roleId?.message}>
          <Select id="user-role" {...register("roleId")}>
            <option value="">Sem cargo</option>
            {(roles.data ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="E-mail" htmlFor="user-email" error={errors.email?.message}>
          <Input id="user-email" type="email" {...register("email")} />
        </Field>
        <Field optional label="Telefone" htmlFor="user-phone" error={errors.phone?.message}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <MaskedInput
                id="user-phone"
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

      <div className="grid grid-cols-2 gap-4">
        <Field
          optional
          label="Matrícula (Login)"
          htmlFor="user-external-reference"
          error={errors.externalReference?.message}
        >
          <Input id="user-external-reference" maxLength={50} {...register("externalReference")} />
        </Field>
        {user ? null : (
          <Field
            optional
            label="Referência"
            htmlFor="user-reference"
            error={errors.reference?.message}
          >
            <Input
              id="user-reference"
              inputMode="numeric"
              maxLength={4}
              placeholder="Em branco = automático"
              {...register("reference")}
            />
          </Field>
        )}
      </div>

      {user ? null : (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Senha inicial" htmlFor="user-password" error={errors.password?.message}>
            <Input id="user-password" type="password" {...register("password")} />
          </Field>
          <Field
            label="Confirmar senha"
            htmlFor="user-confirm-password"
            error={errors.confirmPassword?.message}
          >
            <Input id="user-confirm-password" type="password" {...register("confirmPassword")} />
          </Field>
        </div>
      )}

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

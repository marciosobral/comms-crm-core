import { Button, Field, Input, Modal, Select, Toggle } from "@/components/ui";
import { useRoles } from "@/hooks/use-roles";
import {
  type UserPayload,
  useCreateUser,
  useSetUserStatus,
  useUpdateUser,
} from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import type { UserRow } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const baseSchema = {
  name: z.string().min(1, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  cpf: z.string(),
  phone: z.string(),
  roleId: z.string(),
};

const createSchema = z
  .object({
    ...baseSchema,
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

const editSchema = z.object({ ...baseSchema, password: z.string(), confirmPassword: z.string() });

type UserFormValues = z.infer<typeof createSchema>;

export function UserFormModal({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const roles = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const setUserStatus = useSetUserStatus();
  const mutation = user ? updateUser : createUser;
  const [active, setActive] = useState(user ? user.status === "ACTIVE" : true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(user ? editSchema : createSchema),
    defaultValues: user
      ? {
          name: user.name,
          email: user.email,
          cpf: user.cpf ?? "",
          phone: user.phone ?? "",
          roleId: user.roleId ?? "",
          password: "",
          confirmPassword: "",
        }
      : {
          name: "",
          email: "",
          cpf: "",
          phone: "",
          roleId: "",
          password: "",
          confirmPassword: "",
        },
  });

  const onSubmit = handleSubmit((values) => {
    const payload: UserPayload = {
      name: values.name,
      email: values.email,
      cpf: values.cpf.trim() || undefined,
      phone: values.phone.trim() || undefined,
      roleId: values.roleId || undefined,
    };
    if (user) {
      const nextStatus = active ? "ACTIVE" : "INACTIVE";
      updateUser.mutate(
        { id: user.id, ...payload },
        {
          onSuccess: () => {
            if (nextStatus !== user.status) {
              setUserStatus.mutate({ id: user.id, status: nextStatus }, { onSuccess: onClose });
            } else {
              onClose();
            }
          },
        },
      );
    } else {
      createUser.mutate({ ...payload, password: values.password }, { onSuccess: onClose });
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
        <Field label="CPF" htmlFor="user-cpf" error={errors.cpf?.message}>
          <Input id="user-cpf" placeholder="000.000.000-00" {...register("cpf")} />
        </Field>
        <Field label="Cargo" htmlFor="user-role" error={errors.roleId?.message}>
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
        <Field label="Telefone" htmlFor="user-phone" error={errors.phone?.message}>
          <Input id="user-phone" placeholder="(62) 90000-0000" {...register("phone")} />
        </Field>
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

      {user ? (
        <div className="flex items-center justify-between">
          <span className="text-body text-primary">Usuário ativo</span>
          <Toggle checked={active} onChange={setActive} label="Usuário ativo" />
        </div>
      ) : null}

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

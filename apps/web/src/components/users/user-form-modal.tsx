import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { useRoles } from "@/hooks/use-roles";
import { type UserPayload, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import type { UserRow } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const baseSchema = {
  name: z.string().min(1, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  cpf: z.string(),
  phone: z.string(),
  roleId: z.string(),
};

const createSchema = z.object({
  ...baseSchema,
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

const editSchema = z.object({ ...baseSchema, password: z.string() });

type UserFormValues = z.infer<typeof createSchema>;

export function UserFormModal({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const roles = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const mutation = user ? updateUser : createUser;

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
        }
      : { name: "", email: "", cpf: "", phone: "", roleId: "", password: "" },
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
      updateUser.mutate({ id: user.id, ...payload }, { onSuccess: onClose });
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
      <Field label="Nome" htmlFor="user-name" error={errors.name?.message}>
        <Input id="user-name" {...register("name")} />
      </Field>

      <Field label="E-mail" htmlFor="user-email" error={errors.email?.message}>
        <Input id="user-email" type="email" {...register("email")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="CPF" htmlFor="user-cpf" error={errors.cpf?.message}>
          <Input id="user-cpf" placeholder="000.000.000-00" {...register("cpf")} />
        </Field>
        <Field label="Telefone" htmlFor="user-phone" error={errors.phone?.message}>
          <Input id="user-phone" placeholder="(62) 90000-0000" {...register("phone")} />
        </Field>
      </div>

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

      {user ? null : (
        <Field label="Senha" htmlFor="user-password" error={errors.password?.message}>
          <Input id="user-password" type="password" {...register("password")} />
        </Field>
      )}

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

import { Button, Field, Input, Modal } from "@/components/ui";
import { useSetUserPassword } from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import type { UserRow } from "@/lib/types";
import { MESSAGES } from "@comms-crm-core/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(8, MESSAGES.password),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export function UpdatePasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const setPassword = useSetUserPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setPassword.mutate({ id: user.id, password: values.password }, { onSuccess: onClose });
  });

  const apiError = setPassword.error instanceof ApiError ? setPassword.error.message : null;

  return (
    <Modal
      open
      title="Atualizar senha"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={setPassword.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <p className="text-body text-secondary">Definir uma nova senha para {user.name}.</p>
      <Field label="Nova senha" htmlFor="reset-password" error={errors.password?.message}>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
      </Field>
      <Field
        label="Confirmar senha"
        htmlFor="reset-confirm-password"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="reset-confirm-password"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
      </Field>
      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

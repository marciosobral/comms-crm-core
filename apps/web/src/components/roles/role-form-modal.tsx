import { Button, Checkbox, Field, Input, Modal, Textarea } from "@/components/ui";
import { useCreateRole, useUpdateRole } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";
import { type RoleFormValues, roleFormSchema } from "@/lib/form-schemas";
import { PERMISSION_GROUPS } from "@/lib/permission-labels";
import { SALE_FUNCTIONS, SALE_FUNCTION_LABELS, type SaleFunction } from "@/lib/sale-functions";
import type { Role } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export function RoleFormModal({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const mutation = role ? updateRole : createRole;
  const totalPermissions = PERMISSION_GROUPS.reduce((sum, group) => sum + group.keys.length, 0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
      permissions: role?.permissions ?? [],
      saleFunctions: role?.saleFunctions ?? [],
    },
  });

  const selected = watch("permissions");
  const selectedFunctions = watch("saleFunctions");

  const toggleSaleFunction = (saleFunction: SaleFunction, next: boolean) => {
    setValue(
      "saleFunctions",
      next
        ? [...selectedFunctions, saleFunction]
        : selectedFunctions.filter((item) => item !== saleFunction),
      { shouldDirty: true },
    );
  };

  const togglePermission = (key: string, next: boolean) => {
    setValue("permissions", next ? [...selected, key] : selected.filter((item) => item !== key), {
      shouldDirty: true,
    });
  };

  const toggleGroup = (keys: readonly { key: string }[], selectAll: boolean) => {
    const groupKeys = keys.map((entry) => entry.key);
    const next = selectAll
      ? [...new Set([...selected, ...groupKeys])]
      : selected.filter((item) => !groupKeys.includes(item));
    setValue("permissions", next, { shouldDirty: true });
  };

  const onSubmit = handleSubmit((values) => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      permissions: values.permissions,
      saleFunctions: values.saleFunctions,
    };
    if (role) {
      updateRole.mutate({ id: role.id, ...payload }, { onSuccess: onClose });
    } else {
      createRole.mutate({ ...payload, active: true }, { onSuccess: onClose });
    }
  });

  const apiError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <Modal
      open
      size="lg"
      title={role ? "Editar Cargo" : "Cadastrar Cargo"}
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
      <Field label="Nome do cargo" htmlFor="role-name" error={errors.name?.message}>
        <Input id="role-name" {...register("name")} />
      </Field>

      <Field optional label="Descrição" htmlFor="role-description">
        <Textarea id="role-description" {...register("description")} />
      </Field>

      <section className="flex shrink-0 flex-col gap-3 rounded-lg border border-default bg-surface p-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-eyebrow uppercase tracking-wide text-muted">Funções na venda</h3>
          <p className="text-caption text-muted">
            Quem tem este cargo aparece nestas listas ao preencher uma venda.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {SALE_FUNCTIONS.map((saleFunction) => (
            <Checkbox
              key={saleFunction}
              checked={selectedFunctions.includes(saleFunction)}
              onChange={(next) => toggleSaleFunction(saleFunction, next)}
              label={SALE_FUNCTION_LABELS[saleFunction]}
            />
          ))}
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 items-baseline justify-between gap-3">
          <h3 className="text-eyebrow uppercase tracking-wide text-muted">Permissões</h3>
          <p className="text-caption text-muted">
            {selected.length} de {totalPermissions} selecionadas
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {PERMISSION_GROUPS.map((group) => {
              const allSelected = group.keys.every((entry) => selected.includes(entry.key));
              return (
                <section
                  key={group.label}
                  className="flex flex-col gap-3 rounded-lg border border-default bg-surface p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-eyebrow uppercase tracking-wide text-muted">
                      {group.label}
                    </h4>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.keys, !allSelected)}
                      className="shrink-0 text-caption text-accent hover:text-accent-hover"
                      aria-label={
                        allSelected
                          ? `Desmarcar permissões de ${group.label}`
                          : `Marcar todas as permissões de ${group.label}`
                      }
                    >
                      {allSelected ? "Desmarcar" : "Marcar todas"}
                    </button>
                  </div>
                  {group.keys.map((entry) => (
                    <Checkbox
                      key={entry.key}
                      checked={selected.includes(entry.key)}
                      onChange={(next) => togglePermission(entry.key, next)}
                      label={entry.label}
                    />
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {apiError ? <p className="shrink-0 text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

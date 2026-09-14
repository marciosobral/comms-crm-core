import { Button, Checkbox, Field, Input, Modal, Textarea } from "@/components/ui";
import { useCreateRole, useUpdateRole } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";
import { PERMISSION_GROUPS } from "@/lib/permission-labels";
import type { Role } from "@/lib/types";
import { useState } from "react";

export function RoleFormModal({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const mutation = role ? updateRole : createRole;

  const [name, setName] = useState(role?.name ?? "");
  const [nameError, setNameError] = useState("");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const totalPermissions = PERMISSION_GROUPS.reduce((sum, group) => sum + group.keys.length, 0);

  const togglePermission = (key: string, next: boolean) => {
    setSelected((current) => {
      const draft = new Set(current);
      if (next) {
        draft.add(key);
      } else {
        draft.delete(key);
      }
      return draft;
    });
  };

  const toggleGroup = (keys: readonly { key: string }[], selectAll: boolean) => {
    setSelected((current) => {
      const draft = new Set(current);
      for (const entry of keys) {
        if (selectAll) {
          draft.add(entry.key);
        } else {
          draft.delete(entry.key);
        }
      }
      return draft;
    });
  };

  const onSubmit = () => {
    if (!name.trim()) {
      setNameError("Informe o nome do cargo");
      return;
    }
    setNameError("");
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: [...selected],
    };
    if (role) {
      updateRole.mutate({ id: role.id, ...payload }, { onSuccess: onClose });
    } else {
      createRole.mutate({ ...payload, active: true }, { onSuccess: onClose });
    }
  };

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
      <Field label="Nome do cargo" htmlFor="role-name" error={nameError || undefined}>
        <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Descrição" htmlFor="role-description">
        <Textarea
          id="role-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 items-baseline justify-between gap-3">
          <h3 className="text-eyebrow uppercase tracking-wide text-muted">Permissões</h3>
          <p className="text-caption text-muted">
            {selected.size} de {totalPermissions} selecionadas
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {PERMISSION_GROUPS.map((group) => {
              const allSelected = group.keys.every((entry) => selected.has(entry.key));
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
                      checked={selected.has(entry.key)}
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

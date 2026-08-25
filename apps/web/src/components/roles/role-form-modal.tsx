import { Button, Checkbox, Field, Input, Modal } from "@/components/ui";
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
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));

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

  const onSubmit = () => {
    if (!name.trim()) {
      setNameError("Informe o nome do cargo");
      return;
    }
    setNameError("");
    const payload = { name: name.trim(), permissions: [...selected] };
    if (role) {
      updateRole.mutate({ id: role.id, ...payload }, { onSuccess: onClose });
    } else {
      createRole.mutate(payload, { onSuccess: onClose });
    }
  };

  const apiError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <Modal
      open
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

      <div className="flex max-h-96 flex-col gap-4 overflow-y-auto pr-2">
        {PERMISSION_GROUPS.map((group) => (
          <fieldset key={group.label} className="flex flex-col gap-3">
            <legend className="text-eyebrow uppercase tracking-wide text-muted">
              {group.label}
            </legend>
            {group.keys.map((entry) => (
              <Checkbox
                key={entry.key}
                checked={selected.has(entry.key)}
                onChange={(next) => togglePermission(entry.key, next)}
                label={entry.label}
              />
            ))}
          </fieldset>
        ))}
      </div>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

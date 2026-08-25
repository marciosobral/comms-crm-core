import { RoleFormModal } from "@/components/roles/role-form-modal";
import { Button, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDeleteRole, useRoles } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { usePageMeta } from "../_app";

export const Route = createFileRoute("/_app/cargos")({
  component: RolesPage,
});

function RolesPage() {
  usePageMeta({ title: "Cargos", breadcrumb: ["CRM", "Cargos"] });
  const { user: currentUser } = useCurrentUser();
  const roles = useRoles();
  const deleteRole = useDeleteRole();
  const [modal, setModal] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });
  const [deleteError, setDeleteError] = useState("");

  const canManage = hasPermission(
    currentUser
      ? { isSuperAdmin: currentUser.isSuperAdmin, permissions: currentUser.permissions }
      : null,
    "roles.manage",
  );

  const onDelete = (role: Role) => {
    if (!window.confirm(`Excluir o cargo "${role.name}"?`)) return;
    setDeleteError("");
    deleteRole.mutate(role.id, {
      onError: (error) => {
        setDeleteError(error instanceof ApiError ? error.message : "Erro ao excluir cargo");
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-body text-secondary">
          {roles.data ? `${roles.data.length} cargos` : "Carregando..."}
        </p>
        {canManage ? (
          <Button icon={Plus} onClick={() => setModal({ open: true, role: null })}>
            Cadastrar Cargo
          </Button>
        ) : null}
      </div>

      {deleteError ? <p className="text-caption text-danger">{deleteError}</p> : null}

      <Table>
        <THead>
          <tr>
            <TH>Nome</TH>
            <TH>Permissões</TH>
            <TH>Usuários</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {(roles.data ?? []).map((role) => (
            <TR key={role.id}>
              <TD emphasis>{role.name}</TD>
              <TD>{`${role.permissions.length} permissões`}</TD>
              <TD>{String(role._count?.users ?? 0)}</TD>
              <TD align="right">
                <div className="flex items-center justify-end gap-3">
                  {canManage ? (
                    <Button variant="ghost" onClick={() => setModal({ open: true, role })}>
                      Editar
                    </Button>
                  ) : null}
                  {canManage ? (
                    <Button
                      variant="danger"
                      disabled={deleteRole.isPending}
                      onClick={() => onDelete(role)}
                    >
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {modal.open ? (
        <RoleFormModal role={modal.role} onClose={() => setModal({ open: false, role: null })} />
      ) : null}
    </div>
  );
}

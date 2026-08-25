import { Badge, Button, TBody, TD, TH, THead, TR, Table, Toggle } from "@/components/ui";
import { UserFormModal } from "@/components/users/user-form-modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSetUserStatus, useUsers } from "@/hooks/use-users";
import { hasPermission } from "@/lib/permissions";
import type { UserRow } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { usePageMeta } from "../_app";

export const Route = createFileRoute("/_app/usuarios")({
  component: UsersPage,
});

function UsersPage() {
  usePageMeta({ title: "Usuários", breadcrumb: ["CRM", "Usuários"] });
  const { user: currentUser } = useCurrentUser();
  const users = useUsers();
  const setStatus = useSetUserStatus();
  const [modal, setModal] = useState<{ open: boolean; user: UserRow | null }>({
    open: false,
    user: null,
  });

  const canManage = hasPermission(
    currentUser
      ? { isSuperAdmin: currentUser.isSuperAdmin, permissions: currentUser.permissions }
      : null,
    "users.manage",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-body text-secondary">
          {users.data ? `${users.data.length} usuários` : "Carregando..."}
        </p>
        {canManage ? (
          <Button icon={Plus} onClick={() => setModal({ open: true, user: null })}>
            Adicionar Usuário
          </Button>
        ) : null}
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Nome</TH>
            <TH>CPF</TH>
            <TH>E-mail</TH>
            <TH>Cargo</TH>
            <TH>Ref.</TH>
            <TH>Status</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {(users.data ?? []).map((user) => (
            <TR key={user.id}>
              <TD emphasis>{user.name}</TD>
              <TD emphasis>{user.cpf ?? "—"}</TD>
              <TD>{user.email}</TD>
              <TD>{user.isSuperAdmin ? "Super Admin" : (user.role?.name ?? "Sem cargo")}</TD>
              <TD>{user.reference}</TD>
              <TD>
                <Badge status={user.status === "ACTIVE" ? "ativo" : "inativo"} />
              </TD>
              <TD align="right">
                <div className="flex items-center justify-end gap-4">
                  {canManage ? (
                    <Toggle
                      checked={user.status === "ACTIVE"}
                      disabled={setStatus.isPending || user.isSuperAdmin}
                      onChange={(next) =>
                        setStatus.mutate({ id: user.id, status: next ? "ACTIVE" : "INACTIVE" })
                      }
                      label={
                        user.status === "ACTIVE" ? `Desativar ${user.name}` : `Ativar ${user.name}`
                      }
                    />
                  ) : null}
                  {canManage ? (
                    <Button variant="ghost" onClick={() => setModal({ open: true, user })}>
                      Editar
                    </Button>
                  ) : null}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {modal.open ? (
        <UserFormModal user={modal.user} onClose={() => setModal({ open: false, user: null })} />
      ) : null}
    </div>
  );
}

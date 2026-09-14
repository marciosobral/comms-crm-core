import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import {
  ActionMenu,
  ActionMenuItem,
  Badge,
  Button,
  Field,
  Input,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { UserFormModal } from "@/components/users/user-form-modal";
import { UpdatePasswordModal } from "@/components/users/update-password-modal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoles } from "@/hooks/use-roles";
import { useSetUserStatus, useUsers } from "@/hooks/use-users";
import { formatLastAccess } from "@/lib/format";
import { digitsOnly, formatCpf } from "@comms-core/validation";
import { hasPermission } from "@/lib/permissions";
import type { UserRow } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/usuarios")({
  component: UsersPage,
});

function exportUsersCsv(users: UserRow[]) {
  const header = ["Nome", "CPF", "E-mail", "Cargo", "Ref.", "Último acesso", "Status"];
  const rows = users.map((user) => [
    user.name,
    user.cpf ? formatCpf(user.cpf) : "",
    user.email,
    user.isSuperAdmin ? "Super Admin" : (user.role?.name ?? "Sem cargo"),
    user.reference,
    user.lastLoginAt ?? "",
    user.status === "ACTIVE" ? "Ativo" : "Inativo",
  ]);
  const csv = [header, ...rows].map((line) => line.map((cell) => `"${cell}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "usuarios.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function UsersPage() {
  usePageMeta({ title: "Usuários", breadcrumb: ["CRM", "Usuários"] });
  const { user: currentUser } = useCurrentUser();
  const users = useUsers();
  const roles = useRoles();
  const setStatus = useSetUserStatus();
  const [modal, setModal] = useState<{ open: boolean; user: UserRow | null }>({
    open: false,
    user: null,
  });
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const subject = currentUser
    ? { isSuperAdmin: currentUser.isSuperAdmin, permissions: currentUser.permissions }
    : null;
  const canManage = hasPermission(subject, "users.manage");
  const canManagePasswords = hasPermission(subject, "users.manage_passwords");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const cpfDigits = digitsOnly(q);
    return (users.data ?? []).filter((user) => {
      if (term) {
        const nameEmailMatch =
          user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
        const cpfMatch = cpfDigits.length > 0 && user.cpf?.includes(cpfDigits);
        if (!nameEmailMatch && !cpfMatch) return false;
      }
      if (roleFilter && user.roleId !== roleFilter) return false;
      if (statusFilter && user.status !== statusFilter) return false;
      return true;
    });
  }, [users.data, q, roleFilter, statusFilter]);

  const activeCount = (users.data ?? []).filter((user) => user.status === "ACTIVE").length;
  const inactiveCount = (users.data ?? []).length - activeCount;

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <PageAction>
          <Button icon={Plus} onClick={() => setModal({ open: true, user: null })}>
            Novo Usuário
          </Button>
        </PageAction>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <Field label="Busca" htmlFor="filter-q">
          <Input
            id="filter-q"
            placeholder="Nome, CPF ou e-mail"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Field>
        <Field label="Cargo" htmlFor="filter-role">
          <Select
            id="filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos os cargos</option>
            {(roles.data ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="filter-status">
          <Select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </Select>
        </Field>
      </div>

      <Table
        footer={
          <>
            <span className="text-caption text-muted">
              {(users.data ?? []).length} usuários · {activeCount} ativos · {inactiveCount} inativos
            </span>
            <Button variant="secondary" onClick={() => exportUsersCsv(users.data ?? [])}>
              Exportar lista
            </Button>
          </>
        }
      >
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[12%]" />
          <col className="w-[21%]" />
          <col className="w-[11%]" />
          <col className="w-[7%]" />
          <col className="w-[13%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
        </colgroup>
        <THead>
          <tr>
            <TH>Usuário</TH>
            <TH>CPF</TH>
            <TH>E-mail</TH>
            <TH>Cargo</TH>
            <TH>Ref.</TH>
            <TH className="whitespace-nowrap">Último acesso</TH>
            <TH>Status</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {filtered.map((user) => (
            <TR key={user.id}>
              <TD emphasis>{user.name}</TD>
              <TD>{user.cpf ? formatCpf(user.cpf) : "-"}</TD>
              <TD>{user.email}</TD>
              <TD>{user.isSuperAdmin ? "Super Admin" : (user.role?.name ?? "Sem cargo")}</TD>
              <TD>{user.reference}</TD>
              <TD>{formatLastAccess(user.lastLoginAt)}</TD>
              <TD>
                <Badge status={user.status === "ACTIVE" ? "ativo" : "inativo"} />
              </TD>
              <TD align="right">
                {canManage || canManagePasswords ? (
                  <ActionMenu
                    label={`Ações para ${user.name}`}
                    open={openMenuId === user.id}
                    onOpenChange={(open) => setOpenMenuId(open ? user.id : null)}
                    menuClassName="w-44"
                  >
                    {canManage ? (
                      <ActionMenuItem
                        onClick={() => {
                          setOpenMenuId(null);
                          setModal({ open: true, user });
                        }}
                      >
                        Editar
                      </ActionMenuItem>
                    ) : null}
                    {canManagePasswords ? (
                      <ActionMenuItem
                        onClick={() => {
                          setOpenMenuId(null);
                          setPasswordUser(user);
                        }}
                      >
                        Atualizar senha
                      </ActionMenuItem>
                    ) : null}
                    {canManage && !user.isSuperAdmin ? (
                      <ActionMenuItem
                        disabled={setStatus.isPending}
                        onClick={() => {
                          setOpenMenuId(null);
                          setStatus.mutate({
                            id: user.id,
                            status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                          });
                        }}
                      >
                        {user.status === "ACTIVE" ? "Desativar" : "Ativar"}
                      </ActionMenuItem>
                    ) : null}
                  </ActionMenu>
                ) : null}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {modal.open ? (
        <UserFormModal user={modal.user} onClose={() => setModal({ open: false, user: null })} />
      ) : null}
      {passwordUser ? (
        <UpdatePasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />
      ) : null}
    </div>
  );
}

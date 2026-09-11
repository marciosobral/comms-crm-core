import { RoleFormModal } from "@/components/roles/role-form-modal";
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
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDeleteRole, usePermissionCatalog, useRoles } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/cargos")({
  component: RolesPage,
});

function exportRolesCsv(roles: Role[]) {
  const header = ["Nome", "Descrição", "Permissões", "Usuários", "Status"];
  const rows = roles.map((role) => [
    role.name,
    role.description ?? "",
    String(role.permissions.length),
    String(role._count?.users ?? 0),
    role.active ? "Ativo" : "Inativo",
  ]);
  const csv = [header, ...rows].map((line) => line.map((cell) => `"${cell}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cargos.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function RolesPage() {
  usePageMeta({ title: "Cargos", breadcrumb: ["CRM", "Cargos"] });
  const { user: currentUser } = useCurrentUser();
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const deleteRole = useDeleteRole();
  const [modal, setModal] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (roles.data ?? []).filter((role) => {
      if (term && !role.name.toLowerCase().includes(term)) return false;
      if (statusFilter === "active" && !role.active) return false;
      if (statusFilter === "inactive" && role.active) return false;
      return true;
    });
  }, [roles.data, q, statusFilter]);

  const totalUsers = (roles.data ?? []).reduce((sum, role) => sum + (role._count?.users ?? 0), 0);
  const totalKeys = catalog.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <PageAction>
          <Button icon={Plus} onClick={() => setModal({ open: true, role: null })}>
            Novo Cargo
          </Button>
        </PageAction>
      ) : null}

      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-3">
          <Field label="Busca" htmlFor="filter-q">
            <Input
              id="filter-q"
              placeholder="Nome do cargo"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Status" htmlFor="filter-status">
          <Select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </Select>
        </Field>
      </div>

      {deleteError ? <p className="text-caption text-danger">{deleteError}</p> : null}

      <Table
        footer={
          <>
            <span className="text-caption text-muted">
              {(roles.data ?? []).length} cargos · {totalUsers} usuários vinculados
            </span>
            <Button variant="secondary" onClick={() => exportRolesCsv(roles.data ?? [])}>
              Exportar lista
            </Button>
          </>
        }
      >
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "34%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <THead>
          <tr>
            <TH>Cargo</TH>
            <TH>Descrição</TH>
            <TH align="right">Permissões</TH>
            <TH align="right">Usuários</TH>
            <TH>Status</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {filtered.map((role) => (
            <TR key={role.id}>
              <TD emphasis>{role.name}</TD>
              <TD>{role.description ?? "-"}</TD>
              <TD align="right">
                {role.permissions.length} de {totalKeys || "-"}
              </TD>
              <TD align="right">{String(role._count?.users ?? 0)}</TD>
              <TD>
                <Badge status={role.active ? "ativo" : "inativo"} />
              </TD>
              <TD align="right">
                {canManage ? (
                  <ActionMenu
                    label={`Ações para ${role.name}`}
                    open={openMenuId === role.id}
                    onOpenChange={(open) => setOpenMenuId(open ? role.id : null)}
                  >
                    <ActionMenuItem
                      onClick={() => {
                        setOpenMenuId(null);
                        setModal({ open: true, role });
                      }}
                    >
                      Editar
                    </ActionMenuItem>
                    <ActionMenuItem
                      danger
                      disabled={deleteRole.isPending}
                      onClick={() => {
                        setOpenMenuId(null);
                        onDelete(role);
                      }}
                    >
                      Excluir
                    </ActionMenuItem>
                  </ActionMenu>
                ) : null}
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

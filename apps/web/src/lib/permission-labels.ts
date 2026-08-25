import type { PermissionKey } from "./permissions";

interface PermissionEntry {
  key: PermissionKey;
  label: string;
}

interface PermissionGroup {
  label: string;
  keys: readonly PermissionEntry[];
}

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    label: "Vendas",
    keys: [
      { key: "sales.create", label: "Criar venda" },
      { key: "sales.edit", label: "Editar venda" },
      { key: "sales.change_status", label: "Mudar status da venda" },
      { key: "sales.change_seller", label: "Mudar vendedor da venda" },
      { key: "sales.edit_locked_fields", label: "Editar campos fixos" },
      { key: "sales.view_all", label: "Ver todas as vendas" },
      { key: "sales.supervise", label: "Supervisionar vendas" },
    ],
  },
  {
    label: "Clientes",
    keys: [
      { key: "customers.view", label: "Ver clientes" },
      { key: "customers.edit", label: "Editar clientes" },
    ],
  },
  { label: "Planos", keys: [{ key: "plans.manage", label: "Gerenciar planos" }] },
  { label: "Usuários", keys: [{ key: "users.manage", label: "Gerenciar usuários" }] },
  { label: "Cargos", keys: [{ key: "roles.manage", label: "Gerenciar cargos" }] },
  {
    label: "Relatórios",
    keys: [
      { key: "reports.view", label: "Ver relatórios" },
      { key: "reports.export", label: "Exportar relatórios" },
    ],
  },
  { label: "Importação", keys: [{ key: "imports.run", label: "Executar importação" }] },
  {
    label: "Notificações",
    keys: [{ key: "notifications.collections", label: "Receber avisos de cobrança" }],
  },
  {
    label: "Configurações",
    keys: [{ key: "settings.manage", label: "Gerenciar configurações" }],
  },
] as const;

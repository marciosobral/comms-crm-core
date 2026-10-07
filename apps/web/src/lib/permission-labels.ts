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
      { key: "sales.change_status", label: "Alterar status da venda" },
      { key: "sales.change_seller", label: "Trocar vendedor da venda" },
      { key: "sales.edit_locked_fields", label: "Editar campos bloqueados" },
      { key: "sales.view_all", label: "Ver vendas de toda a operação" },
      { key: "sales.audit", label: "Auditar vendas (marcar auditoria OK)" },
    ],
  },
  {
    label: "Clientes",
    keys: [
      { key: "customers.view", label: "Ver clientes" },
      { key: "customers.view_document", label: "Ver CPF/CNPJ" },
      { key: "customers.edit", label: "Editar clientes" },
    ],
  },
  { label: "Planos", keys: [{ key: "plans.manage", label: "Gerenciar planos" }] },
  {
    label: "Usuários",
    keys: [
      { key: "users.manage", label: "Gerenciar usuários" },
      { key: "users.manage_passwords", label: "Gerenciar senhas" },
    ],
  },
  { label: "Cargos", keys: [{ key: "roles.manage", label: "Gerenciar cargos e permissões" }] },
  {
    label: "Relatórios",
    keys: [
      { key: "reports.view", label: "Ver relatórios e receitas" },
      { key: "reports.export", label: "Exportar relatórios e vendas" },
    ],
  },
  {
    label: "Importação",
    keys: [{ key: "imports.run", label: "Executar importação de planilha" }],
  },
  {
    label: "Notificações",
    keys: [
      {
        key: "notifications.collections",
        label: "Receber avisos de vencimento de todas as vendas",
      },
      { key: "notifications.all_sales", label: "Receber notificações de todas as vendas" },
    ],
  },
  {
    label: "Configurações",
    keys: [{ key: "settings.manage", label: "Gerenciar configurações" }],
  },
] as const;

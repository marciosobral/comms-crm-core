import type { PermissionKey } from "@/lib/permissions";
import {
  ArrowUpFromLine,
  CreditCard,
  LayoutGrid,
  Receipt,
  Settings,
  Shield,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: PermissionKey | null;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, permission: null },
  { to: "/vendas", label: "Vendas", icon: Receipt, permission: null },
  { to: "/clientes", label: "Clientes", icon: UsersRound, permission: "customers.view" },
  { to: "/planos", label: "Planos", icon: CreditCard, permission: null },
  { to: "/receitas", label: "Receitas", icon: TrendingUp, permission: "reports.view" },
  { to: "/usuarios", label: "Usuários", icon: Users, permission: "users.manage" },
  { to: "/cargos", label: "Cargos", icon: Shield, permission: "roles.manage" },
  { to: "/configuracoes", label: "Configurações", icon: Settings, permission: "settings.manage" },
  { to: "/importacao", label: "Importação", icon: ArrowUpFromLine, permission: "imports.run" },
] as const;

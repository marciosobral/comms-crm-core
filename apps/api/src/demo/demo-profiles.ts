import { PERMISSION_CATALOG, type PermissionKey } from "@/permissions/permission-catalog";
import type { SaleFunction } from "@prisma-client";

export const DEMO_PROFILE_KEYS = ["manager", "supervisor", "seller", "backoffice"] as const;

export type DemoProfileKey = (typeof DEMO_PROFILE_KEYS)[number];

export interface DemoProfile {
  /** Shown on the login button and used as the role name. */
  label: string;
  description: string;
  userName: string;
  email: string;
  permissions: readonly PermissionKey[];
  saleFunctions: SaleFunction[];
}

export const DEMO_PROFILES: Record<DemoProfileKey, DemoProfile> = {
  manager: {
    label: "Gerente",
    description: "Vê toda a operação: vendas, receitas, importação e configurações.",
    userName: "Helena Duarte",
    email: "gerente@example.com",
    permissions: PERMISSION_CATALOG,
    saleFunctions: [],
  },
  supervisor: {
    label: "Supervisor",
    description: "Acompanha as vendas da equipe e recebe as notificações.",
    userName: "Rodrigo Teixeira",
    email: "supervisor@example.com",
    permissions: [
      "sales.create",
      "sales.edit",
      "sales.change_status",
      "sales.change_seller",
      "sales.view_all",
      "customers.view",
      "customers.view_document",
      "customers.edit",
      "reports.view",
      "notifications.all_sales",
      "notifications.collections",
    ],
    saleFunctions: ["SUPERVISOR"],
  },
  seller: {
    label: "Vendedor",
    description: "Cadastra vendas e acompanha só as próprias.",
    userName: "Bruna Carvalho",
    email: "vendedor@example.com",
    permissions: ["sales.create", "customers.view"],
    saleFunctions: ["SELLER"],
  },
  backoffice: {
    label: "Backoffice",
    description: "Audita as vendas e atualiza o status da instalação.",
    userName: "Marcos Pereira",
    email: "backoffice@example.com",
    permissions: [
      "sales.edit",
      "sales.change_status",
      "sales.audit",
      "sales.view_all",
      "customers.view",
      "customers.view_document",
      "customers.edit",
    ],
    saleFunctions: ["BKO", "AUDITOR"],
  },
};

export function publicDemoProfiles() {
  return DEMO_PROFILE_KEYS.map((key) => ({
    key,
    label: DEMO_PROFILES[key].label,
    description: DEMO_PROFILES[key].description,
  }));
}

export type UserStatus = "ACTIVE" | "PENDING" | "BLOCKED" | "INACTIVE" | "DELETED";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  status: UserStatus;
  reference: string;
  externalReference: string | null;
  isSuperAdmin: boolean;
  roleId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  role: { id: string; name: string } | null;
  /** Seeded system administrator: cannot be edited, deactivated or have its password changed. */
  isSystem: boolean;
}

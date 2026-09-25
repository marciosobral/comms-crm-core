import type { SaleFunction } from "../sale-functions";

export interface Role {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  permissions: string[];
  saleFunctions: SaleFunction[];
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

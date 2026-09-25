export interface Role {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

import type { DomainRef } from "./shared";

export interface Plan {
  id: string;
  name: string;
  typeId: string;
  type: DomainRef;
  speed: string | null;
  features: string[];
  basePrice: string;
  minPrice: string;
  salesScript: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanRef {
  id: string;
  name: string;
  basePrice: string;
  minPrice: string;
  type: DomainRef;
}

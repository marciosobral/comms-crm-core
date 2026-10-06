import { type PermissionSubject, hasPermission } from "@/permissions/permissions.service";
import type { Prisma } from "@prisma-client";

export function canViewAllSales(actor: PermissionSubject): boolean {
  return hasPermission(actor, "sales.view_all");
}

export function visibleSaleWhere(actor: PermissionSubject & { id: string }): Prisma.SaleWhereInput {
  return canViewAllSales(actor) ? {} : { sellerId: actor.id };
}

import type { Prisma } from "../../prisma/generated/prisma/client/client";
import { type PermissionSubject, hasPermission } from "../permissions/permissions.service";

export function canViewAllSales(actor: PermissionSubject): boolean {
  return hasPermission(actor, "sales.view_all");
}

export function visibleSaleWhere(actor: PermissionSubject & { id: string }): Prisma.SaleWhereInput {
  return canViewAllSales(actor) ? {} : { sellerId: actor.id };
}

import { maskCpfCnpj } from "@comms-core/validation";
import type { PermissionSubject } from "../permissions/permissions.service";

export function canViewCustomerDocument(actor: PermissionSubject): boolean {
  if (actor.isSuperAdmin) return true;
  return (actor.role?.permissions ?? []).includes("customers.view_document");
}

export function withVisibleCustomerDocument<T extends { cpfCnpj?: string | null }>(
  customer: T,
  actor: PermissionSubject,
): T {
  if (canViewCustomerDocument(actor) || !customer.cpfCnpj) return customer;
  return { ...customer, cpfCnpj: maskCpfCnpj(customer.cpfCnpj) };
}

export function withVisibleSaleDocument<T extends { customer?: { cpfCnpj: string } }>(
  sale: T,
  actor: PermissionSubject,
): T {
  if (!sale.customer) return sale;
  return { ...sale, customer: withVisibleCustomerDocument(sale.customer, actor) };
}

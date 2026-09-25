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

export function withVisibleSaleDocument<
  T extends { customer?: { cpfCnpj: string }; accountHolderCpf?: string | null },
>(sale: T, actor: PermissionSubject): T {
  const visible =
    sale.accountHolderCpf && !canViewCustomerDocument(actor)
      ? { ...sale, accountHolderCpf: maskCpfCnpj(sale.accountHolderCpf) }
      : sale;
  if (!visible.customer) return visible;
  return { ...visible, customer: withVisibleCustomerDocument(visible.customer, actor) };
}

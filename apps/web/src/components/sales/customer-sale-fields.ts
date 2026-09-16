import { formatCpfCnpj, formatPhone } from "@comms-core/validation";
import type { Customer } from "../../lib/types";

export function isCustomerSearchQuery(q: string): boolean {
  return q.trim().length >= 2;
}

export function emptyCustomerSaleFields() {
  return {
    customerName: "",
    customerCpfCnpj: "",
    customerBirthDate: "",
    customerMotherName: "",
    customerAddress: "",
    customerCity: "",
    customerState: "",
    customerEmail: "",
    customerPhone1: "",
    customerPhone2: "",
  };
}

export function customerToSaleFields(customer: Customer) {
  return {
    customerName: customer.name,
    customerCpfCnpj: customer.cpfCnpj ? formatCpfCnpj(customer.cpfCnpj) : "",
    customerBirthDate: customer.birthDate?.slice(0, 10) ?? "",
    customerMotherName: customer.motherName ?? "",
    customerAddress: customer.address ?? "",
    customerCity: customer.city ?? "",
    customerState: customer.state ?? "",
    customerEmail: customer.email ?? "",
    customerPhone1: customer.phone1 ? formatPhone(customer.phone1) : "",
    customerPhone2: customer.phone2 ? formatPhone(customer.phone2) : "",
  };
}

export function customerSearchHint(customer: Customer): string {
  const document = formatCpfCnpj(customer.cpfCnpj);
  const contact = customer.phone1 ? formatPhone(customer.phone1) : (customer.email ?? "");
  return contact ? `${document} · ${contact}` : document;
}

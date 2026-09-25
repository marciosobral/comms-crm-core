import { formatCep } from "@comms-crm-core/validation";
import type { Customer, CustomerAddress } from "../../prisma/generated/prisma/client/client";

type AuditedAddress = Pick<
  CustomerAddress,
  "street" | "number" | "noNumber" | "complement" | "neighborhood" | "city" | "state" | "postalCode"
>;

export function addressLine(address: AuditedAddress): string {
  const streetAndNumber = [address.street, address.noNumber ? "S/N" : address.number]
    .filter(Boolean)
    .join(", ");
  const cityAndState = [address.city, address.state].filter(Boolean).join("/");
  return [
    streetAndNumber,
    address.complement,
    address.neighborhood,
    cityAndState,
    address.postalCode ? `CEP ${formatCep(address.postalCode)}` : null,
  ]
    .filter(Boolean)
    .join(" - ");
}

export function customerAuditSnapshot(
  customer: Pick<
    Customer,
    "name" | "cpfCnpj" | "birthDate" | "motherName" | "email" | "phone1" | "phone2"
  > & { addresses: AuditedAddress[] },
): Record<string, unknown> {
  return {
    name: customer.name,
    cpfCnpj: customer.cpfCnpj,
    birthDate: customer.birthDate ? customer.birthDate.toISOString().slice(0, 10) : null,
    motherName: customer.motherName,
    email: customer.email,
    phone1: customer.phone1,
    phone2: customer.phone2,
    addresses: customer.addresses.map(addressLine).join(" | ") || null,
  };
}

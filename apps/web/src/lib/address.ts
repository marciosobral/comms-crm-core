import { digitsOnly, formatCep, normalizeUf } from "@comms-crm-core/validation";
import type { Address, AddressInput, SaleAddress } from "./types";

export type AddressFormValues = {
  postalCode: string;
  street: string;
  number: string;
  noNumber: boolean;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

type AddressParts = Pick<
  Address,
  "postalCode" | "street" | "number" | "noNumber" | "complement" | "neighborhood" | "city" | "state"
> & { isDefault?: boolean };

export function emptyAddressForm(isDefault = false): AddressFormValues {
  return {
    postalCode: "",
    street: "",
    number: "",
    noNumber: false,
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    isDefault,
  };
}

export function defaultAddress(addresses: Address[]): Address | null {
  return addresses.find((item) => item.isDefault) ?? addresses[0] ?? null;
}

export function formatAddressCityUf(address: AddressParts | null | undefined): string {
  if (!address) return "-";
  if (address.city && address.state) return `${address.city}/${address.state}`;
  return address.city ?? address.state ?? "-";
}

export function formatAddressLine(address: AddressParts | null | undefined): string {
  if (!address) return "-";
  const number = address.noNumber ? "S/N" : address.number;
  const street = [address.street, number].filter(Boolean).join(", ");
  const cityUf = formatAddressCityUf(address);
  const parts = [street, address.neighborhood, cityUf === "-" ? null : cityUf].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "-";
}

export function formatAddressOption(address: AddressParts): string {
  const cityUf = formatAddressCityUf(address);
  const number = address.noNumber ? "S/N" : address.number;
  const street = [address.street, number].filter(Boolean).join(", ");
  const parts = [cityUf === "-" ? null : cityUf, street].filter(Boolean);
  const label = parts.join(" - ");
  if (!label) return address.isDefault ? "Endereço padrão" : "Endereço";
  return address.isDefault ? `${label} (padrão)` : label;
}

export function addressSummaryItems(
  address: AddressParts | null | undefined,
): Array<{ label: string; value: string }> {
  if (!address) return [];
  const number = address.noNumber ? "S/N" : address.number?.trim();
  const street = [address.street?.trim(), number].filter(Boolean).join(", ");
  const cityUf = formatAddressCityUf(address);
  const items: Array<{ label: string; value: string }> = [];
  if (address.postalCode) items.push({ label: "CEP", value: formatCep(address.postalCode) });
  if (street) items.push({ label: "Endereço", value: street });
  if (address.complement?.trim()) {
    items.push({ label: "Complemento", value: address.complement.trim() });
  }
  if (address.neighborhood?.trim()) {
    items.push({ label: "Bairro", value: address.neighborhood.trim() });
  }
  if (cityUf !== "-") items.push({ label: "Cidade/UF", value: cityUf });
  return items;
}

export function addressToForm(address: AddressParts): AddressFormValues {
  return {
    postalCode: address.postalCode ? formatCep(address.postalCode) : "",
    street: address.street ?? "",
    number: address.number ?? "",
    noNumber: address.noNumber,
    complement: address.complement ?? "",
    neighborhood: address.neighborhood ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    isDefault: Boolean(address.isDefault),
  };
}

export function isAddressFormEmpty(form: AddressFormValues): boolean {
  return !(
    digitsOnly(form.postalCode) ||
    form.street.trim() ||
    form.number.trim() ||
    form.complement.trim() ||
    form.neighborhood.trim() ||
    form.city.trim() ||
    form.state.trim()
  );
}

export function formToAddressPayload(form: AddressFormValues): AddressInput {
  return {
    postalCode: digitsOnly(form.postalCode) || undefined,
    street: form.street.trim() || undefined,
    number: form.noNumber ? undefined : form.number.trim() || undefined,
    noNumber: form.noNumber,
    complement: form.complement.trim() || undefined,
    neighborhood: form.neighborhood.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() ? normalizeUf(form.state) : undefined,
    isDefault: form.isDefault,
  };
}

export function uniqueAddressCities(rows: Array<{ addresses?: Address[] }>): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const addr of row.addresses ?? []) {
      if (addr.city) set.add(addr.city);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function uniqueAddressStates(rows: Array<{ addresses?: Address[] }>): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const addr of row.addresses ?? []) {
      if (addr.state) set.add(addr.state);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function uniqueSaleCities(rows: Array<{ address?: SaleAddress | null }>): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.address?.city) set.add(row.address.city);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

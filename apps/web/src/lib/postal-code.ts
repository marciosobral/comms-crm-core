import type { AddressFormValues } from "./address";

export interface PostalCodeAddress {
  postalCode: string;
  street: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
}

export function addressFromPostalCode(
  found: PostalCodeAddress,
): Pick<AddressFormValues, "street" | "neighborhood" | "city" | "state"> {
  return {
    street: found.street ?? "",
    neighborhood: found.neighborhood ?? "",
    city: found.city,
    state: found.state,
  };
}

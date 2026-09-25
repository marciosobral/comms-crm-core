import { AddressFields } from "@/components/customers/address-fields";
import { type CustomerSource } from "@/hooks/use-sale-form";
import { formatAddressCityUf } from "@/lib/address";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import type { Address } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatCep } from "@comms-crm-core/validation";
import { Plus } from "lucide-react";
import { useFormContext } from "react-hook-form";

export function AddressSection({
  customerSource,
  existingSelected,
  catalogAddresses,
  customerAddressId,
  onSelectCatalogAddress,
  onStartNewAddress,
}: {
  customerSource: CustomerSource;
  existingSelected: boolean;
  catalogAddresses: Address[];
  customerAddressId: string;
  onSelectCatalogAddress: (addressId: string) => void;
  onStartNewAddress: () => void;
}) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<SaleFormValues>();
  const address = watch("address");

  if (customerSource !== "new" && !existingSelected) return null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Endereço</h3>
      {customerSource === "existing" ? (
        <div className="grid grid-cols-2 gap-3">
          {catalogAddresses.map((item) => {
            const selected = item.id === customerAddressId;
            const number = item.noNumber ? "S/N" : item.number;
            const street = [item.street, number].filter(Boolean).join(", ");
            const cityUf = formatAddressCityUf(item);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectCatalogAddress(item.id)}
                className={cn(
                  "flex min-w-0 items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  selected
                    ? "border-accent bg-surface-hover"
                    : "border-default bg-elevated hover:border-strong",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-accent" : "border-strong",
                  )}
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 wrap-break-word text-body text-primary">
                      {street || "Endereço sem logradouro"}
                    </span>
                    {item.isDefault ? (
                      <span className="shrink-0 rounded-full border border-accent-border bg-accent-subtle px-2 text-caption text-accent">
                        Padrão
                      </span>
                    ) : null}
                  </span>
                  <span className="wrap-break-word text-caption text-muted">
                    {[
                      item.complement,
                      item.neighborhood,
                      cityUf === "-" ? null : cityUf,
                      item.postalCode ? formatCep(item.postalCode) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={customerAddressId === "new"}
            onClick={onStartNewAddress}
            className={cn(
              "flex min-h-18 items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-small transition-colors",
              customerAddressId === "new"
                ? "border-accent bg-surface-hover text-primary"
                : "border-default text-secondary hover:border-strong hover:text-primary",
            )}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Novo endereço
          </button>
        </div>
      ) : null}
      {customerSource === "existing" && customerAddressId !== "new" ? null : (
        <AddressFields
          idPrefix="c-addr"
          value={address}
          onChange={(patch) => setValue("address", { ...address, ...patch }, { shouldDirty: true })}
          errors={{
            postalCode: errors.address?.postalCode?.message,
            state: errors.address?.state?.message,
          }}
        />
      )}
    </section>
  );
}

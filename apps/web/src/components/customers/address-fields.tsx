import { Checkbox, Field, Input, MaskedInput, Select } from "@/components/ui";
import { type AddressFormValues, addressSummaryItems } from "@/lib/address";
import type { Address, SaleAddress } from "@/lib/types";
import { UFS } from "@comms-crm-core/validation";

export function AddressFields({
  idPrefix,
  value,
  onChange,
  errors,
  showDefault = false,
}: {
  idPrefix: string;
  value: AddressFormValues;
  onChange: (patch: Partial<AddressFormValues>) => void;
  errors?: Partial<Record<keyof AddressFormValues, string>>;
  showDefault?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <Field optional label="CEP" htmlFor={`${idPrefix}-cep`} error={errors?.postalCode}>
          <MaskedInput
            id={`${idPrefix}-cep`}
            mask="cep"
            placeholder="00000-000"
            value={value.postalCode}
            onChange={(postalCode) => onChange({ postalCode })}
          />
        </Field>
        <div className="col-span-2">
          <Field optional label="Endereço" htmlFor={`${idPrefix}-street`} error={errors?.street}>
            <Input
              id={`${idPrefix}-street`}
              value={value.street}
              onChange={(e) => onChange({ street: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field optional label="Nº" htmlFor={`${idPrefix}-number`} error={errors?.number}>
              <Input
                id={`${idPrefix}-number`}
                value={value.noNumber ? "S/N" : value.number}
                disabled={value.noNumber}
                onChange={(e) => onChange({ number: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex h-10 items-center">
            <Checkbox
              checked={value.noNumber}
              label="S/N"
              onChange={(noNumber) => onChange({ noNumber, number: noNumber ? "" : value.number })}
            />
          </div>
        </div>
        <div className="col-span-2">
          <Field
            optional
            label="Complemento"
            htmlFor={`${idPrefix}-complement`}
            error={errors?.complement}
          >
            <Input
              id={`${idPrefix}-complement`}
              value={value.complement}
              onChange={(e) => onChange({ complement: e.target.value })}
            />
          </Field>
        </div>
        <Field
          optional
          label="Bairro"
          htmlFor={`${idPrefix}-neighborhood`}
          error={errors?.neighborhood}
        >
          <Input
            id={`${idPrefix}-neighborhood`}
            value={value.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
          />
        </Field>
        <Field optional label="Cidade" htmlFor={`${idPrefix}-city`} error={errors?.city}>
          <Input
            id={`${idPrefix}-city`}
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </Field>
        <Field optional label="UF" htmlFor={`${idPrefix}-state`} error={errors?.state}>
          <Select
            id={`${idPrefix}-state`}
            value={value.state}
            onChange={(e) => onChange({ state: e.target.value })}
          >
            <option value="" />
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {showDefault ? (
        <Checkbox
          checked={value.isDefault}
          label="Endereço padrão"
          onChange={(isDefault) => onChange({ isDefault })}
        />
      ) : null}
    </div>
  );
}

export function AddressSummary({
  address,
}: {
  address: Address | SaleAddress | null | undefined;
}) {
  const items = addressSummaryItems(address);
  if (items.length === 0) {
    return <p className="text-body text-secondary">Nenhum endereço selecionado.</p>;
  }
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-caption text-muted">{item.label}</dt>
          <dd className="min-w-0 text-body text-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

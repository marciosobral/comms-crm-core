import { Checkbox, Field, Input, Select } from "@/components/ui";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import type { DomainValue } from "@/lib/types";
import { Controller, useFormContext } from "react-hook-form";
import { domainOptions } from "./domain-options";

export function OperationalSection({
  mode,
  canEditLocked,
  mailingOptions,
}: {
  mode: "create" | "edit";
  canEditLocked: boolean;
  mailingOptions: DomainValue[];
}) {
  const { register, control } = useFormContext<SaleFormValues>();

  if (mode === "create") {
    return (
      <Controller
        name="brscan"
        control={control}
        render={({ field }) => (
          <Checkbox
            checked={field.value}
            onChange={field.onChange}
            label="CPF validado no BRScan"
          />
        )}
      />
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Operacional</h3>
      <div className="grid grid-cols-3 gap-4">
        <Field optional label="Login" htmlFor="s-login">
          <Input id="s-login" disabled={!canEditLocked} {...register("login")} />
        </Field>
        <Field optional label="Mailing" htmlFor="s-mailing">
          <Select id="s-mailing" {...register("mailingId")}>
            <option value="">Nenhum</option>
            {domainOptions(mailingOptions)}
          </Select>
        </Field>
        <Field optional label="Ordem de venda" htmlFor="s-order">
          <Input id="s-order" {...register("orderNumber")} />
        </Field>
      </div>
    </section>
  );
}

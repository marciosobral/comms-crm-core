import { Field, Input, Select } from "@/components/ui";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import type { DomainValue } from "@/lib/types";
import { useFormContext } from "react-hook-form";
import { domainOptions } from "./domain-options";

export function OperationalSection({
  mailingOptions,
}: {
  mailingOptions: DomainValue[];
}) {
  const { register } = useFormContext<SaleFormValues>();

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Operacional</h3>
      <div className="grid grid-cols-2 gap-4">
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

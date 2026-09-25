import { Field, Select } from "@/components/ui";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import type { UserRow } from "@/lib/types";
import { useFormContext } from "react-hook-form";
import { userOptions } from "./domain-options";

export function PeopleSection({
  canChangeSeller,
  users,
}: {
  canChangeSeller: boolean;
  users: UserRow[];
}) {
  const { register } = useFormContext<SaleFormValues>();

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Pessoas</h3>
      <div className="grid grid-cols-2 gap-4">
        {canChangeSeller ? (
          <Field label="Vendedor" htmlFor="s-seller">
            <Select id="s-seller" {...register("sellerId")}>
              {userOptions(users)}
            </Select>
          </Field>
        ) : null}
        <Field optional label="Supervisor" htmlFor="s-supervisor">
          <Select id="s-supervisor" {...register("supervisorId")}>
            <option value="">Nenhum</option>
            {userOptions(users)}
          </Select>
        </Field>
        <Field optional label="Auditor" htmlFor="s-auditor">
          <Select id="s-auditor" {...register("auditorId")}>
            <option value="">Nenhum</option>
            {userOptions(users)}
          </Select>
        </Field>
        <Field optional label="BKO" htmlFor="s-bko">
          <Select id="s-bko" {...register("bkoId")}>
            <option value="">Nenhum</option>
            {userOptions(users)}
          </Select>
        </Field>
      </div>
    </section>
  );
}

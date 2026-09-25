import { Field, Select } from "@/components/ui";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import type { AssignablePeople, UserRef } from "@/lib/types";
import { useFormContext } from "react-hook-form";
import { userOptions } from "./domain-options";

export interface CurrentPeople {
  seller: UserRef | null;
  supervisor: UserRef | null;
  bko: UserRef | null;
  auditor: UserRef | null;
}

export function PeopleSection({
  canChangeSeller,
  people,
  currentPeople,
}: {
  canChangeSeller: boolean;
  people: AssignablePeople | undefined;
  currentPeople: CurrentPeople;
}) {
  const { register } = useFormContext<SaleFormValues>();

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Pessoas</h3>
      <div className="grid grid-cols-2 gap-4">
        {canChangeSeller ? (
          <Field label="Vendedor" htmlFor="s-seller">
            <Select id="s-seller" {...register("sellerId")}>
              {userOptions(people?.SELLER, currentPeople.seller)}
            </Select>
          </Field>
        ) : null}
        <Field optional label="Supervisor" htmlFor="s-supervisor">
          <Select id="s-supervisor" {...register("supervisorId")}>
            <option value="">Nenhum</option>
            {userOptions(people?.SUPERVISOR, currentPeople.supervisor)}
          </Select>
        </Field>
        <Field optional label="Auditor" htmlFor="s-auditor">
          <Select id="s-auditor" {...register("auditorId")}>
            <option value="">Nenhum</option>
            {userOptions(people?.AUDITOR, currentPeople.auditor)}
          </Select>
        </Field>
        <Field optional label="BKO" htmlFor="s-bko">
          <Select id="s-bko" {...register("bkoId")}>
            <option value="">Nenhum</option>
            {userOptions(people?.BKO, currentPeople.bko)}
          </Select>
        </Field>
      </div>
    </section>
  );
}

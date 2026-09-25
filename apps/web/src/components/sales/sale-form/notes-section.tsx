import { Field, Textarea } from "@/components/ui";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import { useFormContext } from "react-hook-form";

export function NotesSection() {
  const { register } = useFormContext<SaleFormValues>();

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Observações</h3>
      <Field optional label="Observações" htmlFor="s-notes">
        <Textarea id="s-notes" {...register("notes")} />
      </Field>
    </section>
  );
}

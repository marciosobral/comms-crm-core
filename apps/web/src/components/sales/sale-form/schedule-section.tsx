import { Field, Input, Select } from "@/components/ui";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import type { DomainValue } from "@/lib/types";
import { CalendarCheck } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { domainOptions } from "./domain-options";

export function ScheduleSection({
  schedulePeriodOptions,
  showInstalledAt,
  onRevealInstalledAt,
}: {
  schedulePeriodOptions: DomainValue[];
  showInstalledAt: boolean;
  onRevealInstalledAt: () => void;
}) {
  const { register, watch } = useFormContext<SaleFormValues>();
  const installedAt = watch("installedAt");

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Agendamento</h3>
      <div className="grid grid-cols-3 gap-4">
        <Field optional label="Dia do agendamento" htmlFor="s-schedule-date">
          <Input
            id="s-schedule-date"
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            {...register("scheduleDate")}
          />
        </Field>
        <Field optional label="Período" htmlFor="s-schedule-period">
          <Select id="s-schedule-period" {...register("schedulePeriodId")}>
            <option value="">Nenhum</option>
            {domainOptions(schedulePeriodOptions)}
          </Select>
        </Field>
        <Field optional label="Data da instalação" htmlFor="s-installed">
          {showInstalledAt ? (
            <Input
              id="s-installed"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              autoFocus={!installedAt}
              {...register("installedAt")}
            />
          ) : (
            <button
              id="s-installed"
              type="button"
              onClick={onRevealInstalledAt}
              className="flex h-10 w-full items-center gap-2 rounded-md border border-dashed border-default px-3 text-body text-secondary transition-colors hover:border-strong hover:text-primary"
            >
              <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
              Adicionar data
            </button>
          )}
        </Field>
      </div>
    </section>
  );
}

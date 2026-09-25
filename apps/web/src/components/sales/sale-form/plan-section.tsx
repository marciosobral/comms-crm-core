import { Field, Input, Select } from "@/components/ui";
import type { SaleFormValues } from "@/lib/sale-form-schema";
import type { DomainValue, Plan } from "@/lib/types";
import { useFormContext } from "react-hook-form";
import { DirectDebitFields, type DirectDebitForm } from "../direct-debit-fields";
import { PriceSlider } from "../price-slider";
import { domainOptions } from "./domain-options";

export function PlanSection({
  mode,
  planTypeOptions,
  typePlans,
  pricingPlan,
  priceMin,
  priceMax,
  paymentOptions,
  isDebit,
  onPlanTypeChange,
  onPlanChange,
  onDirectDebitChange,
}: {
  mode: "create" | "edit";
  planTypeOptions: DomainValue[];
  typePlans: Plan[];
  pricingPlan: Plan | null;
  priceMin: number;
  priceMax: number;
  paymentOptions: DomainValue[];
  isDebit: boolean;
  onPlanTypeChange: (planTypeId: string) => void;
  onPlanChange: (planId: string) => void;
  onDirectDebitChange: (patch: Partial<DirectDebitForm>) => void;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<SaleFormValues>();
  const values = watch();
  const { planTypeId, planId, amount } = values;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Plano e valor</h3>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Tipo" htmlFor="s-plan-type">
          <Select
            id="s-plan-type"
            value={planTypeId}
            onChange={(e) => onPlanTypeChange(e.target.value)}
          >
            {domainOptions(planTypeOptions)}
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Plano" htmlFor="s-plan">
            <Select id="s-plan" value={planId} onChange={(e) => onPlanChange(e.target.value)}>
              <option value="">Nenhum</option>
              {typePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {pricingPlan ? (
        <PriceSlider
          min={priceMin}
          max={priceMax}
          value={amount}
          onChange={(nextAmount) => setValue("amount", nextAmount, { shouldDirty: true })}
        />
      ) : (
        <p className="text-caption text-muted">Selecione um plano para definir o valor.</p>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Field label="Data da venda" htmlFor="s-date">
          <Input id="s-date" type="date" min="1900-01-01" max="2100-12-31" {...register("date")} />
        </Field>
        <Field label="Forma de pagamento" htmlFor="s-payment">
          <Select id="s-payment" {...register("paymentMethodId")}>
            <option value="">Selecione</option>
            {domainOptions(paymentOptions)}
          </Select>
        </Field>
        <Field
          optional={mode === "edit"}
          label="Vencimento (dia)"
          htmlFor="s-due"
          error={errors.dueDay?.message}
        >
          <Select id="s-due" {...register("dueDay")}>
            <option value="">Selecione</option>
            {[5, 10, 15, 20].map((day) => (
              <option key={day} value={day}>
                Dia {day}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {isDebit ? <DirectDebitFields value={values} onChange={onDirectDebitChange} /> : null}
    </section>
  );
}

import { commitTag } from "@/components/plans/commit-tag";
import { FeatureTagInput } from "@/components/plans/feature-tag-input";
import { Button, Field, Input, MaskedInput, Modal, Select, Textarea } from "@/components/ui";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { type PlanPayload, useCreatePlan, useUpdatePlan } from "@/hooks/use-plans";
import { ApiError } from "@/lib/api";
import { type PlanFormValues, planFormSchema } from "@/lib/form-schemas";
import { parsePrice } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { applyMoneyMask } from "@comms-crm-core/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

function formatPlanPrice(value: string | number): string {
  return applyMoneyMask(String(value).replace(".", ","));
}

export function PlanFormModal({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const mutation = plan ? updatePlan : createPlan;
  const planTypes = useActiveDomainValues("PLAN_TYPE");
  const [featureDraft, setFeatureDraft] = useState("");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: plan
      ? {
          name: plan.name,
          typeId: plan.typeId,
          speed: plan.speed ?? "",
          features: plan.features,
          basePrice: formatPlanPrice(plan.basePrice),
          minPrice: formatPlanPrice(plan.minPrice),
          salesScript: plan.salesScript ?? "",
        }
      : {
          name: "",
          typeId: "",
          speed: "",
          features: [],
          basePrice: "",
          minPrice: "",
          salesScript: "",
        },
  });

  const onSubmit = handleSubmit((values) => {
    const payload: PlanPayload = {
      name: values.name,
      typeId: values.typeId,
      speed: values.speed.trim() || undefined,
      features: commitTag(values.features, featureDraft),
      basePrice: parsePrice(values.basePrice),
      minPrice: parsePrice(values.minPrice),
      salesScript: values.salesScript.trim() || undefined,
    };
    if (plan) {
      updatePlan.mutate({ id: plan.id, ...payload }, { onSuccess: onClose });
    } else {
      createPlan.mutate({ ...payload, active: true }, { onSuccess: onClose });
    }
  });

  const apiError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <Modal
      open
      title={plan ? "Editar Plano" : "Cadastrar Plano"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <Field label="Nome" htmlFor="plan-name" error={errors.name?.message}>
        <Input id="plan-name" {...register("name")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo" htmlFor="plan-type" error={errors.typeId?.message}>
          <Controller
            name="typeId"
            control={control}
            render={({ field }) => (
              <Select id="plan-type" value={field.value} onChange={field.onChange}>
                <option value="">Selecione</option>
                {(planTypes.data ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.value}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>
        <Field optional label="Velocidade" htmlFor="plan-speed" error={errors.speed?.message}>
          <Input id="plan-speed" placeholder="600 Mbps" {...register("speed")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Preço base (R$)" htmlFor="plan-base" error={errors.basePrice?.message}>
          <Controller
            name="basePrice"
            control={control}
            render={({ field }) => (
              <MaskedInput
                id="plan-base"
                mask="money"
                placeholder="119,90"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>
        <Field label="Preço mínimo (R$)" htmlFor="plan-min" error={errors.minPrice?.message}>
          <Controller
            name="minPrice"
            control={control}
            render={({ field }) => (
              <MaskedInput
                id="plan-min"
                mask="money"
                placeholder="79,90"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>
      </div>

      <Field label="Itens inclusos" htmlFor="plan-features" error={errors.features?.message}>
        <Controller
          name="features"
          control={control}
          render={({ field }) => (
            <FeatureTagInput
              id="plan-features"
              value={field.value}
              draft={featureDraft}
              onChange={field.onChange}
              onDraftChange={setFeatureDraft}
            />
          )}
        />
      </Field>

      <Field
        optional
        label="Script de venda"
        htmlFor="plan-script"
        error={errors.salesScript?.message}
      >
        <Textarea id="plan-script" {...register("salesScript")} />
      </Field>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

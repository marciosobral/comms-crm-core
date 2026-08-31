import { Button, Field, Input, Modal, Select, Textarea, Toggle } from "@/components/ui";
import {
  type PlanPayload,
  useCreatePlan,
  useSetPlanActive,
  useUpdatePlan,
} from "@/hooks/use-plans";
import { ApiError } from "@/lib/api";
import { parsePrice } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const priceField = z
  .string()
  .refine((value) => !Number.isNaN(parsePrice(value)) && parsePrice(value) > 0, "Preço inválido");

const planFormSchema = z
  .object({
    name: z.string().min(1, "Informe o nome"),
    type: z.enum(["FIXED", "INTERNET", "COMBO"]),
    speed: z.string(),
    featuresText: z.string(),
    basePrice: priceField,
    minPrice: priceField,
    salesScript: z.string(),
  })
  .refine((data) => parsePrice(data.minPrice) <= parsePrice(data.basePrice), {
    message: "Preço mínimo não pode ser maior que o preço base",
    path: ["minPrice"],
  });

type PlanFormValues = z.infer<typeof planFormSchema>;

const TYPE_OPTIONS: Array<{ value: Plan["type"]; label: string }> = [
  { value: "FIXED", label: "Fixo" },
  { value: "INTERNET", label: "Internet" },
  { value: "COMBO", label: "Combo" },
];

export function PlanFormModal({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const setPlanActive = useSetPlanActive();
  const mutation = plan ? updatePlan : createPlan;
  const [active, setActive] = useState(plan?.active ?? true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: plan
      ? {
          name: plan.name,
          type: plan.type,
          speed: plan.speed ?? "",
          featuresText: plan.features.join("\n"),
          basePrice: String(Number(plan.basePrice)).replace(".", ","),
          minPrice: String(Number(plan.minPrice)).replace(".", ","),
          salesScript: plan.salesScript ?? "",
        }
      : {
          name: "",
          type: "INTERNET",
          speed: "",
          featuresText: "",
          basePrice: "",
          minPrice: "",
          salesScript: "",
        },
  });

  const onSubmit = handleSubmit((values) => {
    const payload: PlanPayload = {
      name: values.name,
      type: values.type,
      speed: values.speed.trim() || undefined,
      features: values.featuresText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      basePrice: parsePrice(values.basePrice),
      minPrice: parsePrice(values.minPrice),
      salesScript: values.salesScript.trim() || undefined,
    };
    if (plan) {
      updatePlan.mutate(
        { id: plan.id, ...payload },
        {
          onSuccess: () => {
            if (active !== plan.active) {
              setPlanActive.mutate({ id: plan.id, active }, { onSuccess: onClose });
            } else {
              onClose();
            }
          },
        },
      );
    } else {
      createPlan.mutate({ ...payload, active }, { onSuccess: onClose });
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
        <Field label="Tipo" htmlFor="plan-type" error={errors.type?.message}>
          <Select id="plan-type" {...register("type")}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Velocidade" htmlFor="plan-speed" error={errors.speed?.message}>
          <Input id="plan-speed" placeholder="600 Mbps" {...register("speed")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Preço base (R$)" htmlFor="plan-base" error={errors.basePrice?.message}>
          <Input id="plan-base" placeholder="119,90" {...register("basePrice")} />
        </Field>
        <Field label="Preço mínimo (R$)" htmlFor="plan-min" error={errors.minPrice?.message}>
          <Input id="plan-min" placeholder="79,90" {...register("minPrice")} />
        </Field>
      </div>

      <Field
        label="Features (uma por linha)"
        htmlFor="plan-features"
        error={errors.featuresText?.message}
      >
        <Textarea id="plan-features" {...register("featuresText")} />
      </Field>

      <Field label="Script de venda" htmlFor="plan-script" error={errors.salesScript?.message}>
        <Textarea id="plan-script" {...register("salesScript")} />
      </Field>

      <div className="flex items-center justify-between">
        <span className="text-body text-primary">Plano ativo e disponível para venda</span>
        <Toggle checked={active} onChange={setActive} label="Plano ativo e disponível para venda" />
      </div>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

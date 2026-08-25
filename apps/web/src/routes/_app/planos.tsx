import { PlanFormModal } from "@/components/plans/plan-form-modal";
import { Badge, Button, Toggle } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePlans, useSetPlanActive } from "@/hooks/use-plans";
import { formatBRL } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import type { Plan } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { usePageMeta } from "../_app";

export const Route = createFileRoute("/_app/planos")({
  component: PlansPage,
});

const TYPE_LABELS: Record<Plan["type"], string> = {
  FIXED: "Fixo",
  INTERNET: "Internet",
  COMBO: "Combo",
};

function PlansPage() {
  usePageMeta({ title: "Planos", breadcrumb: ["CRM", "Planos"] });
  const { user } = useCurrentUser();
  const plans = usePlans();
  const setActive = useSetPlanActive();
  const [modal, setModal] = useState<{ open: boolean; plan: Plan | null }>({
    open: false,
    plan: null,
  });

  const canManage = hasPermission(
    user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
    "plans.manage",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-body text-secondary">
          {plans.data ? `${plans.data.length} planos cadastrados` : "Carregando..."}
        </p>
        {canManage ? (
          <Button icon={Plus} onClick={() => setModal({ open: true, plan: null })}>
            Cadastrar Plano
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(plans.data ?? []).map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-h3 text-primary">{plan.name}</h3>
                <span className="text-caption text-muted">
                  {TYPE_LABELS[plan.type]}
                  {plan.speed ? ` · ${plan.speed}` : ""}
                </span>
              </div>
              <Badge status={plan.active ? "ativo" : "inativo"} />
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-display text-primary">{formatBRL(plan.basePrice)}</span>
              <span className="text-caption text-muted">mín. {formatBRL(plan.minPrice)}</span>
            </div>

            <ul className="flex flex-col gap-2">
              {plan.features.map((feature) => (
                <li key={feature} className="text-small text-secondary">
                  {feature}
                </li>
              ))}
            </ul>

            {canManage ? (
              <div className="mt-auto flex items-center justify-between border-t border-subtle pt-4">
                <Toggle
                  checked={plan.active}
                  disabled={setActive.isPending}
                  onChange={(next) => setActive.mutate({ id: plan.id, active: next })}
                  label={plan.active ? `Desativar ${plan.name}` : `Ativar ${plan.name}`}
                />
                <Button variant="secondary" onClick={() => setModal({ open: true, plan })}>
                  Editar
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {modal.open ? (
        <PlanFormModal plan={modal.plan} onClose={() => setModal({ open: false, plan: null })} />
      ) : null}
    </div>
  );
}

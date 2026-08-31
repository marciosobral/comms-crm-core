import { PlanFormModal } from "@/components/plans/plan-form-modal";
import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import { Badge, Button, Modal, Toggle } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePlans, useSetPlanActive } from "@/hooks/use-plans";
import { formatBRL } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

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
  const [scriptPlan, setScriptPlan] = useState<Plan | null>(null);

  const canManage = hasPermission(
    user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
    "plans.manage",
  );

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <PageAction>
          <Button icon={Plus} onClick={() => setModal({ open: true, plan: null })}>
            Novo Plano
          </Button>
        </PageAction>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        {(plans.data ?? []).map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className={cn("text-h3", plan.active ? "text-primary" : "text-muted")}>
                  {plan.name}
                </h3>
                <Badge status={plan.active ? "ativo" : "inativo"} />
              </div>
              <div className="flex flex-col items-end">
                <span className={cn("text-display", plan.active ? "text-primary" : "text-muted")}>
                  {formatBRL(plan.basePrice)}
                </span>
                <span className="text-caption text-muted">
                  por mês · mínimo {formatBRL(plan.minPrice)}
                </span>
              </div>
            </div>

            <span className="text-caption text-muted">
              {TYPE_LABELS[plan.type]}
              {plan.speed ? ` · ${plan.speed}` : ""}
            </span>

            <p className="min-h-10 text-small text-secondary">
              {plan.features.length > 0 ? plan.features.join(" · ") : null}
            </p>

            <div className="flex items-center justify-between border-t border-subtle pt-4">
              <div className="flex items-center gap-3">
                {canManage ? (
                  <Toggle
                    checked={plan.active}
                    disabled={setActive.isPending}
                    onChange={(next) => setActive.mutate({ id: plan.id, active: next })}
                    label={plan.active ? `Desativar ${plan.name}` : `Ativar ${plan.name}`}
                  />
                ) : null}
                <span className="text-small text-secondary">
                  {plan.active ? "Plano ativo" : "Plano inativo"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setScriptPlan(plan)}>
                  Ver script
                </Button>
                {canManage ? (
                  <Button variant="secondary" onClick={() => setModal({ open: true, plan })}>
                    Editar
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal.open ? (
        <PlanFormModal plan={modal.plan} onClose={() => setModal({ open: false, plan: null })} />
      ) : null}

      {scriptPlan ? (
        <Modal
          open
          title={`Script de venda · ${scriptPlan.name}`}
          onClose={() => setScriptPlan(null)}
          footer={
            <Button variant="secondary" onClick={() => setScriptPlan(null)}>
              Fechar
            </Button>
          }
        >
          <p className="whitespace-pre-wrap text-body text-secondary">
            {scriptPlan.salesScript ?? "Nenhum script cadastrado para este plano."}
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

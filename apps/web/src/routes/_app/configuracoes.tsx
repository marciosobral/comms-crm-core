import { Button, Field, Input, TBody, TD, TH, THead, TR, Table, Toggle } from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useCreateDomainValue,
  useDomainValues,
  useSystemSettings,
  useUpdateDomainValue,
  useUpdateSystemSetting,
} from "@/hooks/use-settings";
import { ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import type { DomainType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { usePageMeta } from "../_app";

export const Route = createFileRoute("/_app/configuracoes")({
  component: SettingsPage,
});

const DOMAIN_TABS: Array<{ type: DomainType; label: string }> = [
  { type: "SALE_STATUS", label: "Status de venda" },
  { type: "PAYMENT_METHOD", label: "Forma de pagamento" },
  { type: "SYSTEM", label: "Sistema" },
  { type: "MAILING", label: "Mailing" },
  { type: "PDV", label: "PDV" },
];

function SettingsPage() {
  usePageMeta({ title: "Configurações", breadcrumb: ["CRM", "Configurações"] });
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<DomainType>("SALE_STATUS");

  const canManage = hasPermission(
    user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
    "settings.manage",
  );

  if (!canManage) {
    return (
      <p className="text-body text-secondary">
        Você não tem permissão para gerenciar configurações.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-h3 text-primary">Tabelas de domínio</h2>
        <div className="flex gap-1 border-b border-default">
          {DOMAIN_TABS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setTab(item.type)}
              className={cn(
                "h-10 rounded-t-md px-4 text-body transition-colors",
                tab === item.type
                  ? "border-b-2 border-accent text-primary"
                  : "text-secondary hover:text-primary",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <DomainValuesPanel type={tab} />
      </section>

      <SystemSettingsPanel />
    </div>
  );
}

function DomainValuesPanel({ type }: { type: DomainType }) {
  const values = useDomainValues(type);
  const createValue = useCreateDomainValue();
  const updateValue = useUpdateDomainValue();
  const [newValue, setNewValue] = useState("");

  const onAdd = () => {
    const value = newValue.trim();
    if (!value) return;
    createValue.mutate({ type, value }, { onSuccess: () => setNewValue("") });
  };

  const apiError = createValue.error instanceof ApiError ? createValue.error.message : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <div className="w-80">
          <Field label="Novo valor" htmlFor="new-domain-value">
            <Input
              id="new-domain-value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </Field>
        </div>
        <Button icon={Plus} loading={createValue.isPending} onClick={onAdd}>
          Adicionar
        </Button>
      </div>
      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}

      <Table>
        <THead>
          <tr>
            <TH>Valor</TH>
            <TH>Ordem</TH>
            <TH align="right">Ativo</TH>
          </tr>
        </THead>
        <TBody>
          {(values.data ?? []).map((item) => (
            <TR key={item.id}>
              <TD emphasis>{item.value}</TD>
              <TD>{String(item.order)}</TD>
              <TD align="right">
                <div className="flex justify-end">
                  <Toggle
                    checked={item.active}
                    disabled={updateValue.isPending}
                    onChange={(next) => updateValue.mutate({ id: item.id, active: next })}
                    label={item.active ? `Desativar ${item.value}` : `Ativar ${item.value}`}
                  />
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function SystemSettingsPanel() {
  const settings = useSystemSettings();
  const updateSetting = useUpdateSystemSetting();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");

  const current = (key: string): string => {
    if (key in drafts) return drafts[key];
    const found = settings.data?.find((setting) => setting.key === key);
    if (!found) return "";
    return Array.isArray(found.value) ? found.value.join(", ") : String(found.value);
  };

  const save = (key: string) => {
    setFeedback("");
    const raw = current(key).trim();

    if (key === "DUE_NOTIFICATION_DAYS") {
      const parts = raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length === 0 || parts.some((part) => !/^\d+$/.test(part))) {
        setFeedback("Informe dias válidos separados por vírgula");
        return;
      }
    }

    const value =
      key === "DUE_NOTIFICATION_DAYS"
        ? raw
            .split(",")
            .map((part) => Number(part.trim()))
            .filter((n) => !Number.isNaN(n))
        : Number(raw);
    updateSetting.mutate(
      { key, value },
      {
        onSuccess: () => setFeedback("Configuração salva."),
        onError: (error) =>
          setFeedback(error instanceof ApiError ? error.message : "Erro ao salvar"),
      },
    );
  };

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <h2 className="text-h3 text-primary">Parâmetros</h2>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field
            label="Antecedência do aviso de vencimento (dias, separados por vírgula)"
            htmlFor="setting-due"
          >
            <Input
              id="setting-due"
              value={current("DUE_NOTIFICATION_DAYS")}
              onChange={(e) => setDrafts((d) => ({ ...d, DUE_NOTIFICATION_DAYS: e.target.value }))}
            />
          </Field>
        </div>
        <Button
          variant="secondary"
          loading={updateSetting.isPending}
          onClick={() => save("DUE_NOTIFICATION_DAYS")}
        >
          Salvar
        </Button>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Limite de upload (MB)" htmlFor="setting-upload">
            <Input
              id="setting-upload"
              value={current("UPLOAD_MAX_MB")}
              onChange={(e) => setDrafts((d) => ({ ...d, UPLOAD_MAX_MB: e.target.value }))}
            />
          </Field>
        </div>
        <Button
          variant="secondary"
          loading={updateSetting.isPending}
          onClick={() => save("UPLOAD_MAX_MB")}
        >
          Salvar
        </Button>
      </div>

      {feedback ? <p className="text-caption text-secondary">{feedback}</p> : null}
    </section>
  );
}

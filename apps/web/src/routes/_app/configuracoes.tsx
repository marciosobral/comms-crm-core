import { DomainValueModal } from "@/components/settings/domain-value-modal";
import { usePageMeta } from "@/components/shell/page-meta";
import {
  Badge,
  type BadgeStatus,
  Button,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  Toggle,
} from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useDomainValues,
  useSystemSettings,
  useUpdateDomainValue,
  useUpdateSystemSetting,
} from "@/hooks/use-settings";
import { ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import type { DomainType, DomainValue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/configuracoes")({
  component: SettingsPage,
});

const DOMAIN_TABS: Array<{ type: DomainType; label: string; addLabel: string }> = [
  { type: "SALE_STATUS", label: "Status de venda", addLabel: "Adicionar status" },
  { type: "PAYMENT_METHOD", label: "Forma de pagamento", addLabel: "Adicionar forma de pagamento" },
  { type: "SYSTEM", label: "Sistema", addLabel: "Adicionar sistema" },
  { type: "MAILING", label: "Mailing", addLabel: "Adicionar mailing" },
  { type: "PDV", label: "PDV", addLabel: "Adicionar PDV" },
];

const PILL_CYCLE: BadgeStatus[] = ["gross", "agInstalacao", "agBiometria", "cancelada", "venda"];

function SettingsPage() {
  usePageMeta({ title: "Configurações", breadcrumb: ["CRM", "Configurações"] });
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<DomainType>("SALE_STATUS");

  const canManage = hasPermission(
    user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
    "settings.manage",
  );

  const saleStatus = useDomainValues("SALE_STATUS", canManage);
  const paymentMethod = useDomainValues("PAYMENT_METHOD", canManage);
  const system = useDomainValues("SYSTEM", canManage);
  const mailing = useDomainValues("MAILING", canManage);
  const pdv = useDomainValues("PDV", canManage);
  const counts = new Map<DomainType, ReturnType<typeof useDomainValues>>([
    ["SALE_STATUS", saleStatus],
    ["PAYMENT_METHOD", paymentMethod],
    ["SYSTEM", system],
    ["MAILING", mailing],
    ["PDV", pdv],
  ]);

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
        <div className="inline-flex w-fit gap-1 rounded-[10px] border border-default bg-elevated p-1">
          {DOMAIN_TABS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setTab(item.type)}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-3 text-small transition-colors",
                tab === item.type ? "bg-surface text-primary" : "text-secondary hover:text-primary",
              )}
            >
              {item.label}
              <span className="text-caption text-muted">
                {counts.get(item.type)?.data?.length ?? "—"}
              </span>
            </button>
          ))}
        </div>
        <DomainValuesPanel type={tab} />
        <OtherDomainTablesCard activeType={tab} counts={counts} onSelectTab={setTab} />
      </section>

      <SystemSettingsPanel />
    </div>
  );
}

function DomainValuesPanel({ type }: { type: DomainType }) {
  const tabInfo = DOMAIN_TABS.find((item) => item.type === type) ?? DOMAIN_TABS[0];
  const values = useDomainValues(type);
  const updateValue = useUpdateDomainValue();
  const [modal, setModal] = useState<{ open: boolean; value: DomainValue | null }>({
    open: false,
    value: null,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const items = values.data ?? [];
  const activeCount = items.filter((item) => item.active).length;
  const salesTotal = items.reduce((sum, item) => sum + (item.salesCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-caption text-muted">
          {items.length} valores · {activeCount} ativos
          {type === "SALE_STATUS" ? ` · usados em ${salesTotal} vendas` : ""}
        </span>
        <Button icon={Plus} onClick={() => setModal({ open: true, value: null })}>
          {tabInfo.addLabel}
        </Button>
      </div>

      <Table>
        <colgroup>
          <col style={{ width: "22%" }} />
          <col style={{ width: "32%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <THead>
          <tr>
            <TH>Valor</TH>
            <TH>Descrição</TH>
            <TH align="right">Ordem</TH>
            <TH align="right">Vendas</TH>
            <TH align="right">Ativo</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {items.map((item, index) => (
            <TR key={item.id}>
              <TD emphasis>
                <Badge status={PILL_CYCLE[index % PILL_CYCLE.length]} label={item.value} />
              </TD>
              <TD>{item.description ?? "—"}</TD>
              <TD align="right">{String(item.order)}</TD>
              <TD align="right">{String(item.salesCount ?? 0)}</TD>
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
              <TD align="right">
                <div
                  className="relative inline-block"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <button
                    type="button"
                    aria-label={`Ações para ${item.value}`}
                    onClick={() =>
                      setOpenMenuId((current) => (current === item.id ? null : item.id))
                    }
                    className="rounded-md p-1.5 text-secondary hover:bg-surface-hover hover:text-primary"
                  >
                    <MoreHorizontal size={16} aria-hidden />
                  </button>
                  {openMenuId === item.id ? (
                    <div className="absolute right-0 top-8 z-10 w-32 rounded-md border border-default bg-elevated py-1 shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-small text-secondary hover:bg-surface-hover hover:text-primary"
                        onClick={() => {
                          setOpenMenuId(null);
                          setModal({ open: true, value: item });
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  ) : null}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {modal.open ? (
        <DomainValueModal
          type={type}
          value={modal.value}
          onClose={() => setModal({ open: false, value: null })}
        />
      ) : null}
    </div>
  );
}

function OtherDomainTablesCard({
  activeType,
  counts,
  onSelectTab,
}: {
  activeType: DomainType;
  counts: Map<DomainType, ReturnType<typeof useDomainValues>>;
  onSelectTab: (type: DomainType) => void;
}) {
  const others = DOMAIN_TABS.filter((item) => item.type !== activeType);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-primary">Demais tabelas de domínio</h3>
        <span className="text-caption text-muted">
          Somente leitura — selecione a aba correspondente para editar
        </span>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {others.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelectTab(item.type)}
            className="flex flex-col gap-2 text-left"
          >
            <span className="text-eyebrow uppercase tracking-wide text-muted">{item.label}</span>
            <ul className="flex flex-col gap-1">
              {(counts.get(item.type)?.data ?? [])
                .filter((value) => value.active)
                .map((value) => (
                  <li key={value.id} className="text-small text-secondary">
                    {value.value}
                  </li>
                ))}
            </ul>
          </button>
        ))}
      </div>
    </section>
  );
}

const DUE_NOTIFICATION_PRESETS = [
  { value: "0", label: "No dia do vencimento" },
  { value: "1", label: "1 dia antes do vencimento" },
  { value: "0,1", label: "1 dia antes e no dia do vencimento" },
  { value: "3,1,0", label: "3 dias, 1 dia antes e no dia do vencimento" },
];

const UPLOAD_MB_PRESETS = ["10", "25", "50", "100"];

function SystemSettingsPanel() {
  const settings = useSystemSettings();
  const updateSetting = useUpdateSystemSetting();
  const [feedback, setFeedback] = useState("");

  const rawValue = (key: string): string => {
    const found = settings.data?.find((setting) => setting.key === key);
    if (!found) return "";
    return Array.isArray(found.value) ? found.value.join(",") : String(found.value);
  };

  const dueValue = rawValue("DUE_NOTIFICATION_DAYS");
  const uploadValue = rawValue("UPLOAD_MAX_MB");

  const dueOptions = DUE_NOTIFICATION_PRESETS.some((option) => option.value === dueValue)
    ? DUE_NOTIFICATION_PRESETS
    : [...DUE_NOTIFICATION_PRESETS, { value: dueValue, label: `Personalizado (${dueValue})` }];

  const uploadOptions = UPLOAD_MB_PRESETS.includes(uploadValue)
    ? UPLOAD_MB_PRESETS
    : [...UPLOAD_MB_PRESETS, uploadValue].filter(Boolean);

  const saveDue = (raw: string) => {
    setFeedback("");
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map(Number);
    updateSetting.mutate(
      { key: "DUE_NOTIFICATION_DAYS", value: parts },
      {
        onSuccess: () => setFeedback("Configuração salva."),
        onError: (error) =>
          setFeedback(error instanceof ApiError ? error.message : "Erro ao salvar"),
      },
    );
  };

  const saveUpload = (raw: string) => {
    setFeedback("");
    updateSetting.mutate(
      { key: "UPLOAD_MAX_MB", value: Number(raw) },
      {
        onSuccess: () => setFeedback("Configuração salva."),
        onError: (error) =>
          setFeedback(error instanceof ApiError ? error.message : "Erro ao salvar"),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-6">
        <section className="flex flex-col gap-3 rounded-lg border border-default bg-surface p-6">
          <h3 className="text-h3 text-primary">Notificações de vencimento</h3>
          <div className="flex flex-col gap-2">
            <span className="text-small text-secondary">Antecedência do aviso</span>
            <Select value={dueValue} onChange={(e) => saveDue(e.target.value)}>
              {dueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-caption text-muted">
            Enviado para os usuários com a permissão "Receber avisos de vencimento".
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-default bg-surface p-6">
          <h3 className="text-h3 text-primary">Anexos</h3>
          <div className="flex flex-col gap-2">
            <span className="text-small text-secondary">Limite de upload por arquivo</span>
            <Select value={uploadValue} onChange={(e) => saveUpload(e.target.value)}>
              {uploadOptions.map((option) => (
                <option key={option} value={option}>
                  {option} MB
                </option>
              ))}
            </Select>
          </div>
          <p className="text-caption text-muted">
            Tipos permitidos: PNG, JPG, MP3 e PDF. Guardados no disco da VPS, em pasta por venda.
          </p>
        </section>
      </div>

      {feedback ? <p className="text-caption text-secondary">{feedback}</p> : null}
    </div>
  );
}

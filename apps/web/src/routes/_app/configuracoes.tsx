import { DomainValueModal } from "@/components/settings/domain-value-modal";
import { usePageMeta } from "@/components/shell/page-meta";
import {
  ActionMenu,
  ActionMenuItem,
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
} from "@/components/ui";
import { usePermission } from "@/hooks/use-permission";
import { useRowMenu } from "@/hooks/use-row-menu";
import {
  useDomainValues,
  useReorderDomainValues,
  useSystemSettings,
  useUpdateDomainValue,
  useUpdateSystemSetting,
} from "@/hooks/use-settings";
import { ApiError } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import type { DomainType, DomainValue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { GripVertical, Plus } from "lucide-react";
import { type DragEvent, useState } from "react";

export const Route = createFileRoute("/_app/configuracoes")({
  component: SettingsPage,
});

const DOMAIN_TABS: Array<{ type: DomainType; label: string; addLabel: string }> = [
  { type: "SALE_STATUS", label: "Status de venda", addLabel: "Adicionar status" },
  { type: "PAYMENT_METHOD", label: "Forma de pagamento", addLabel: "Adicionar forma de pagamento" },
  { type: "SYSTEM", label: "Sistema", addLabel: "Adicionar sistema" },
  { type: "MAILING", label: "Mailing", addLabel: "Adicionar mailing" },
  { type: "PDV", label: "PDV", addLabel: "Adicionar PDV" },
  { type: "PLAN_TYPE", label: "Tipo de plano", addLabel: "Adicionar tipo de plano" },
  { type: "SCHEDULE_PERIOD", label: "Período de instalação", addLabel: "Adicionar período" },
];

type SettingsTab = DomainType | "SYSTEMIC";

const PILL_CYCLE: BadgeStatus[] = ["gross", "agInstalacao", "agBiometria", "cancelada", "venda"];

function moveItem<T extends { id: string }>(items: T[], fromId: string, toId: string): T[] {
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [row] = next.splice(from, 1);
  if (!row) return items;
  next.splice(to, 0, row);
  return next;
}

function SettingsPage() {
  usePageMeta({ title: "Configurações", breadcrumb: [APP_NAME, "Configurações"] });
  const [tab, setTab] = useState<SettingsTab>("SYSTEMIC");

  const canManage = usePermission("settings.manage");

  const saleStatus = useDomainValues("SALE_STATUS", canManage);
  const paymentMethod = useDomainValues("PAYMENT_METHOD", canManage);
  const system = useDomainValues("SYSTEM", canManage);
  const mailing = useDomainValues("MAILING", canManage);
  const pdv = useDomainValues("PDV", canManage);
  const planType = useDomainValues("PLAN_TYPE", canManage);
  const schedulePeriod = useDomainValues("SCHEDULE_PERIOD", canManage);
  const counts: Record<DomainType, ReturnType<typeof useDomainValues>> = {
    SALE_STATUS: saleStatus,
    PAYMENT_METHOD: paymentMethod,
    SYSTEM: system,
    MAILING: mailing,
    PDV: pdv,
    PLAN_TYPE: planType,
    SCHEDULE_PERIOD: schedulePeriod,
  };

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
          <button
            type="button"
            onClick={() => setTab("SYSTEMIC")}
            className={cn(
              "flex h-8 items-center rounded-md px-3 text-small transition-colors",
              tab === "SYSTEMIC" ? "bg-surface text-primary" : "text-secondary hover:text-primary",
            )}
          >
            Sistêmicas
          </button>
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
                {counts[item.type].data?.length ?? "-"}
              </span>
            </button>
          ))}
        </div>
        {tab === "SYSTEMIC" ? <SystemSettingsPanel /> : <DomainValuesPanel type={tab} />}
      </section>
    </div>
  );
}

function DomainValuesPanel({ type }: { type: DomainType }) {
  const tabInfo = DOMAIN_TABS.find((item) => item.type === type) ?? DOMAIN_TABS[0];
  const values = useDomainValues(type);
  const updateValue = useUpdateDomainValue();
  const reorder = useReorderDomainValues();
  const [modal, setModal] = useState<{ open: boolean; value: DomainValue | null }>({
    open: false,
    value: null,
  });
  const rowMenu = useRowMenu();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const items = values.data ?? [];
  const activeCount = items.filter((item) => item.active).length;
  const salesTotal = items.reduce((sum, item) => sum + (item.salesCount ?? 0), 0);

  const onDragStart = (event: DragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  };

  const onDragOver = (event: DragEvent<HTMLTableRowElement>, id: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  };

  const onDrop = (event: DragEvent<HTMLTableRowElement>, id: string) => {
    event.preventDefault();
    const fromId = event.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    setOverId(null);
    if (!fromId) return;
    const next = moveItem(items, fromId, id);
    if (next === items) return;
    reorder.mutate({ type, ids: next.map((item) => item.id) });
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setOverId(null);
  };

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
          <col style={{ width: "40px" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "36%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <THead>
          <tr>
            <TH>
              <span className="sr-only">Reordenar</span>
            </TH>
            <TH>Valor</TH>
            <TH>Descrição</TH>
            <TH align="right">Vendas</TH>
            <TH>Status</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {items.map((item, index) => (
            <TR
              key={item.id}
              onDragOver={(event) => onDragOver(event, item.id)}
              onDrop={(event) => onDrop(event, item.id)}
              onDragEnd={onDragEnd}
              className={cn(
                draggingId === item.id ? "opacity-50" : undefined,
                overId === item.id && draggingId && overId !== draggingId
                  ? "bg-surface-hover"
                  : undefined,
              )}
            >
              <TD className="pr-0" truncate={false}>
                <button
                  type="button"
                  draggable
                  aria-label={`Reordenar ${item.value}`}
                  onDragStart={(event) => onDragStart(event, item.id)}
                  className="inline-flex cursor-grab rounded-md p-1 text-muted hover:text-secondary active:cursor-grabbing"
                >
                  <GripVertical size={16} aria-hidden />
                </button>
              </TD>
              <TD emphasis truncate={false}>
                <Badge status={PILL_CYCLE[index % PILL_CYCLE.length]} label={item.value} />
              </TD>
              <TD>{item.description ?? "-"}</TD>
              <TD align="right">{String(item.salesCount ?? 0)}</TD>
              <TD truncate={false}>
                <Badge status={item.active ? "ativo" : "inativo"} />
              </TD>
              <TD align="right" truncate={false}>
                <ActionMenu
                  label={`Ações para ${item.value}`}
                  open={rowMenu.isOpen(item.id)}
                  onOpenChange={rowMenu.onOpenChange(item.id)}
                >
                  <ActionMenuItem
                    onClick={() => {
                      rowMenu.close();
                      setModal({ open: true, value: item });
                    }}
                  >
                    Editar
                  </ActionMenuItem>
                  <ActionMenuItem
                    disabled={updateValue.isPending}
                    onClick={() => {
                      rowMenu.close();
                      updateValue.mutate({ id: item.id, active: !item.active });
                    }}
                  >
                    {item.active ? "Desativar" : "Ativar"}
                  </ActionMenuItem>
                </ActionMenu>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {modal.open ? (
        <DomainValueModal
          type={type}
          value={modal.value}
          addLabel={tabInfo.addLabel}
          onClose={() => setModal({ open: false, value: null })}
        />
      ) : null}
    </div>
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

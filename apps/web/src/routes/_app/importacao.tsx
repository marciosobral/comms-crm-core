import { usePageMeta } from "@/components/shell/page-meta";
import {
  Badge,
  type BadgeStatus,
  Button,
  Field,
  Input,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import {
  useCreateImportMapping,
  useImportBatch,
  useImportBatches,
  useImportMappings,
  useReprocessBatch,
  useUploadImport,
} from "@/hooks/use-imports";
import { usePlans } from "@/hooks/use-plans";
import { useUsers } from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import type {
  DomainType,
  ImportBatchDetail,
  ImportBatchRow,
  ImportMappingKind,
  ImportRowStatus,
} from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, Upload } from "lucide-react";
import { useRef, useState } from "react";

export const Route = createFileRoute("/_app/importacao")({
  component: ImportPage,
});

const YEARS = [2024, 2025, 2026, 2027];

const ROW_STATUS: Record<ImportRowStatus, { label: string; badge: BadgeStatus }> = {
  CREATED: { label: "Criada", badge: "ativo" },
  UPDATED: { label: "Atualizada", badge: "agInstalacao" },
  SKIPPED: { label: "Pulada", badge: "inativo" },
  PENDING: { label: "Pendente", badge: "cancelada" },
};

const DOMAIN_TYPE_LABELS: Array<{ type: DomainType; label: string }> = [
  { type: "SALE_STATUS", label: "Status de venda" },
  { type: "PAYMENT_METHOD", label: "Forma de pagamento" },
  { type: "SYSTEM", label: "Sistema" },
  { type: "MAILING", label: "Mailing" },
  { type: "PDV", label: "PDV" },
];

const MAPPING_KIND_LABELS: Record<ImportMappingKind, string> = {
  USER: "Usuário",
  DOMAIN: "Valor de domínio",
  PLAN: "Plano",
};

function ImportPage() {
  usePageMeta({ title: "Importação", breadcrumb: ["CRM", "Importação"] });
  const { user } = useCurrentUser();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const canRun = hasPermission(
    user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
    "imports.run",
  );

  if (!canRun) {
    return (
      <p className="text-body text-secondary">Você não tem permissão para executar importações.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <UploadCard />
      <BatchesTable selectedBatchId={selectedBatchId} onSelect={setSelectedBatchId} />
      {selectedBatchId ? <BatchDetail batchId={selectedBatchId} /> : null}
      <MappingsSection />
    </div>
  );
}

function UploadCard() {
  const upload = useUploadImport();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(2026);

  const onSubmit = () => {
    if (!file) return;
    upload.mutate(
      { file, year },
      {
        onSuccess: () => {
          setFile(null);
          if (fileInput.current) fileInput.current.value = "";
        },
      },
    );
  };

  const apiError = upload.error instanceof ApiError ? upload.error.message : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Importar planilha</h3>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Arquivo" htmlFor="import-file">
            <input
              ref={fileInput}
              id="import-file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              {file ? file.name : "Escolher arquivo"}
            </Button>
          </Field>
        </div>

        <div className="w-40">
          <Field label="Ano" htmlFor="import-year">
            <Select id="import-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button icon={Upload} disabled={!file} loading={upload.isPending} onClick={onSubmit}>
          Importar planilha
        </Button>
      </div>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}

      {upload.data?.stats ? (
        <p className="text-caption text-secondary">
          {upload.data.stats.total} linhas · {upload.data.stats.created} criadas ·{" "}
          {upload.data.stats.updated} atualizadas · {upload.data.stats.skipped} puladas ·{" "}
          {upload.data.stats.pending} pendências
        </p>
      ) : null}
    </section>
  );
}

const BATCHES_PER_PAGE = 12;

function BatchesTable({
  selectedBatchId,
  onSelect,
}: {
  selectedBatchId: string | null;
  onSelect: (id: string) => void;
}) {
  const batches = useImportBatches();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const allBatches = batches.data ?? [];
  const total = allBatches.length;
  const lastPage = Math.max(1, Math.ceil(total / BATCHES_PER_PAGE));
  const currentPage = Math.min(page, lastPage);
  const firstShown = total === 0 ? 0 : (currentPage - 1) * BATCHES_PER_PAGE + 1;
  const lastShown = Math.min(currentPage * BATCHES_PER_PAGE, total);
  const pageBatches = allBatches.slice(firstShown - 1, lastShown);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Lotes de importação</h3>

      <Table
        footer={
          total > 0 ? (
            <>
              <span className="text-caption text-muted">
                Mostrando {firstShown}–{lastShown} de {total} lotes
              </span>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={currentPage >= lastPage}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Próxima
                </Button>
              </div>
            </>
          ) : undefined
        }
      >
        <colgroup>
          <col style={{ width: "20%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <THead>
          <tr>
            <TH>Arquivo</TH>
            <TH className="whitespace-nowrap">Enviado por</TH>
            <TH>Data</TH>
            <TH align="right">Linhas</TH>
            <TH align="right">Criadas</TH>
            <TH align="right">Atualizadas</TH>
            <TH align="right">Pendências</TH>
            <TH align="right">Puladas</TH>
            <TH>Status</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {pageBatches.map((batch: ImportBatchRow) => (
            <TR key={batch.id}>
              <TD emphasis>{batch.fileName}</TD>
              <TD>{batch.importedBy.name}</TD>
              <TD>{formatDate(batch.createdAt)}</TD>
              <TD align="right">{batch.stats?.total ?? "—"}</TD>
              <TD align="right">{batch.stats?.created ?? "—"}</TD>
              <TD align="right">{batch.stats?.updated ?? "—"}</TD>
              <TD align="right">{batch.stats?.pending ?? "—"}</TD>
              <TD align="right">{batch.stats?.skipped ?? "—"}</TD>
              <TD>
                {batch.stats ? (
                  batch.stats.pending > 0 ? (
                    <Badge status="agInstalacao" label="PENDÊNCIAS" />
                  ) : (
                    <Badge status="gross" label="CONCLUÍDA" />
                  )
                ) : (
                  "—"
                )}
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
                    aria-label={`Ações para ${batch.fileName}`}
                    onClick={() =>
                      setOpenMenuId((current) => (current === batch.id ? null : batch.id))
                    }
                    className="rounded-md p-1.5 text-secondary hover:bg-surface-hover hover:text-primary"
                  >
                    <MoreHorizontal size={16} aria-hidden />
                  </button>
                  {openMenuId === batch.id ? (
                    <div className="absolute right-0 top-8 z-10 w-36 rounded-md border border-default bg-elevated py-1 shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-small text-secondary hover:bg-surface-hover hover:text-primary"
                        onClick={() => {
                          setOpenMenuId(null);
                          onSelect(batch.id);
                        }}
                      >
                        Detalhes
                      </button>
                    </div>
                  ) : null}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {selectedBatchId === null && (batches.data ?? []).length === 0 ? (
        <p className="text-body text-secondary">Nenhum lote importado.</p>
      ) : null}
    </section>
  );
}

function BatchDetail({ batchId }: { batchId: string }) {
  const batch = useImportBatch(batchId);
  const reprocess = useReprocessBatch();

  if (!batch.data) return null;

  const detail: ImportBatchDetail = batch.data;
  const stats = detail.stats;
  const apiError = reprocess.error instanceof ApiError ? reprocess.error.message : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-primary">Lote: {detail.fileName}</h3>
        {stats && stats.pending > 0 ? (
          <Button
            variant="secondary"
            loading={reprocess.isPending}
            onClick={() => reprocess.mutate(detail.id)}
          >
            Reprocessar pendências
          </Button>
        ) : null}
      </div>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}

      {stats ? (
        <p className="text-caption text-secondary">
          {stats.total} linhas · {stats.created} criadas · {stats.updated} atualizadas ·{" "}
          {stats.skipped} puladas · {stats.pending} pendências
        </p>
      ) : null}

      <Table>
        <THead>
          <tr>
            <TH>Nº</TH>
            <TH>Cliente</TH>
            <TH>CPF</TH>
            <TH>Status</TH>
            <TH>Mensagem</TH>
          </tr>
        </THead>
        <TBody>
          {detail.rows.map((row, index) => (
            <TR key={row.id}>
              <TD>{index + 1}</TD>
              <TD emphasis>{row.raw[19] ?? "—"}</TD>
              <TD>{row.raw[17] ?? "—"}</TD>
              <TD>
                <Badge status={ROW_STATUS[row.status].badge} label={ROW_STATUS[row.status].label} />
              </TD>
              <TD>{row.message ?? "—"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </section>
  );
}

function MappingsSection() {
  const mappings = useImportMappings();
  const createMapping = useCreateImportMapping();
  const users = useUsers();
  const plans = usePlans();

  const [kind, setKind] = useState<ImportMappingKind>("USER");
  const [domainType, setDomainType] = useState<DomainType>("SALE_STATUS");
  const [sourceValue, setSourceValue] = useState("");
  const [targetId, setTargetId] = useState("");

  const domainValues = useActiveDomainValues(domainType);

  const targetOptions: Array<{ id: string; label: string }> =
    kind === "USER"
      ? (users.data ?? []).map((u) => ({ id: u.id, label: u.name }))
      : kind === "PLAN"
        ? (plans.data ?? []).map((p) => ({ id: p.id, label: p.name }))
        : (domainValues.data ?? []).map((v) => ({ id: v.id, label: v.value }));

  const onSubmit = () => {
    if (!sourceValue.trim() || !targetId) return;
    createMapping.mutate(
      {
        kind,
        domainType: kind === "DOMAIN" ? domainType : undefined,
        sourceValue: sourceValue.trim(),
        targetId,
      },
      {
        onSuccess: () => {
          setSourceValue("");
          setTargetId("");
        },
      },
    );
  };

  const apiError = createMapping.error instanceof ApiError ? createMapping.error.message : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Mapeamentos</h3>

      <Table>
        <THead>
          <tr>
            <TH>Tipo</TH>
            <TH>Origem</TH>
            <TH>Alvo</TH>
          </tr>
        </THead>
        <TBody>
          {(mappings.data ?? []).map((mapping) => (
            <TR key={mapping.id}>
              <TD emphasis>{MAPPING_KIND_LABELS[mapping.kind]}</TD>
              <TD>{mapping.sourceValue}</TD>
              <TD>{mapping.targetLabel ?? mapping.targetId}</TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Field label="Tipo" htmlFor="mapping-kind">
            <Select
              id="mapping-kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as ImportMappingKind);
                setTargetId("");
              }}
            >
              <option value="USER">Usuário</option>
              <option value="DOMAIN">Valor de domínio</option>
              <option value="PLAN">Plano</option>
            </Select>
          </Field>
        </div>

        {kind === "DOMAIN" ? (
          <div className="w-48">
            <Field label="Tipo de domínio" htmlFor="mapping-domain-type">
              <Select
                id="mapping-domain-type"
                value={domainType}
                onChange={(e) => {
                  setDomainType(e.target.value as DomainType);
                  setTargetId("");
                }}
              >
                {DOMAIN_TYPE_LABELS.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}

        <div className="w-64">
          <Field label="Valor na planilha" htmlFor="mapping-source">
            <Input
              id="mapping-source"
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
            />
          </Field>
        </div>

        <div className="w-64">
          <Field label="Alvo" htmlFor="mapping-target">
            <Select
              id="mapping-target"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">Selecione</option>
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button loading={createMapping.isPending} onClick={onSubmit}>
          Adicionar mapeamento
        </Button>
      </div>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </section>
  );
}

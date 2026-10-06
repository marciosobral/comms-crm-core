import { usePageMeta } from "@/components/shell/page-meta";
import {
  ActionMenu,
  ActionMenuItem,
  Badge,
  type BadgeStatus,
  Button,
  CardItem,
  CardList,
  Field,
  Pagination,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import {
  useImportBatch,
  useImportBatches,
  useReprocessBatch,
  useUploadImport,
} from "@/hooks/use-imports";
import { usePermission } from "@/hooks/use-permission";
import { useRowMenu } from "@/hooks/use-row-menu";
import { getErrorMessage } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { formatInstantDate } from "@/lib/format";
import type { ImportBatchDetail, ImportBatchRow, ImportRowStatus } from "@/lib/types";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";

export const Route = createFileRoute("/_app/importacao")({
  beforeLoad: () => {
    // Disabled until the import flow is released.
    throw redirect({ to: "/" });
  },
  component: ImportPage,
});

const YEARS = [2024, 2025, 2026, 2027];

const ROW_STATUS: Record<ImportRowStatus, { label: string; badge: BadgeStatus }> = {
  CREATED: { label: "Criada", badge: "ativo" },
  UPDATED: { label: "Atualizada", badge: "agInstalacao" },
  SKIPPED: { label: "Pulada", badge: "inativo" },
  PENDING: { label: "Pendente", badge: "cancelada" },
};

function ImportPage() {
  usePageMeta({ title: "Importação", breadcrumb: [APP_NAME, "Importação"] });
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const canRun = usePermission("imports.run");

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

  const apiError = upload.error ? getErrorMessage(upload.error, "Erro ao enviar a planilha") : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-4 sm:p-6">
      <h3 className="text-h3 text-primary">Importar planilha</h3>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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

        <div className="w-full sm:w-40">
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

        <Button
          className="w-full sm:w-auto"
          icon={Upload}
          disabled={!file}
          loading={upload.isPending}
          onClick={onSubmit}
        >
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
  const rowMenu = useRowMenu();
  const [page, setPage] = useState(1);

  const allBatches = batches.data ?? [];
  const total = allBatches.length;
  const lastPage = Math.max(1, Math.ceil(total / BATCHES_PER_PAGE));
  const currentPage = Math.min(page, lastPage);
  const firstShown = total === 0 ? 0 : (currentPage - 1) * BATCHES_PER_PAGE + 1;
  const lastShown = Math.min(currentPage * BATCHES_PER_PAGE, total);
  const pageBatches = allBatches.slice(firstShown - 1, lastShown);

  const pagination =
    total > 0 ? (
      <Pagination
        firstShown={firstShown}
        lastShown={lastShown}
        total={total}
        noun="lotes"
        hasPrevious={currentPage > 1}
        hasNext={currentPage < lastPage}
        onPrevious={() => setPage(currentPage - 1)}
        onNext={() => setPage(currentPage + 1)}
      />
    ) : undefined;

  const renderActions = (batch: ImportBatchRow) => (
    <ActionMenu
      label={`Ações para ${batch.fileName}`}
      open={rowMenu.isOpen(batch.id)}
      onOpenChange={rowMenu.onOpenChange(batch.id)}
      menuClassName="w-36"
    >
      <ActionMenuItem
        onClick={() => {
          rowMenu.close();
          onSelect(batch.id);
        }}
      >
        Detalhes
      </ActionMenuItem>
    </ActionMenu>
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-4 sm:p-6">
      <h3 className="text-h3 text-primary">Lotes de importação</h3>

      <Table className="hidden sm:block" footer={pagination}>
        <colgroup>
          <col style={{ width: "20%" }} />
          <col className="hidden lg:table-column" style={{ width: "13%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col className="hidden lg:table-column" style={{ width: "9%" }} />
          <col className="hidden lg:table-column" style={{ width: "10%" }} />
          <col style={{ width: "9%" }} />
          <col className="hidden lg:table-column" style={{ width: "8%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <THead>
          <tr>
            <TH>Arquivo</TH>
            <TH className="hidden whitespace-nowrap lg:table-cell">Enviado por</TH>
            <TH>Data</TH>
            <TH align="right">Linhas</TH>
            <TH align="right" className="hidden lg:table-cell">
              Criadas
            </TH>
            <TH align="right" className="hidden lg:table-cell">
              Atualizadas
            </TH>
            <TH align="right">Pendências</TH>
            <TH align="right" className="hidden lg:table-cell">
              Puladas
            </TH>
            <TH>Status</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {pageBatches.map((batch: ImportBatchRow) => (
            <TR key={batch.id} onClick={() => onSelect(batch.id)}>
              <TD emphasis>{batch.fileName}</TD>
              <TD className="hidden lg:table-cell">{batch.importedBy.name}</TD>
              <TD>{formatInstantDate(batch.createdAt)}</TD>
              <TD align="right">{batch.stats?.total ?? "-"}</TD>
              <TD align="right" className="hidden lg:table-cell">
                {batch.stats?.created ?? "-"}
              </TD>
              <TD align="right" className="hidden lg:table-cell">
                {batch.stats?.updated ?? "-"}
              </TD>
              <TD align="right">{batch.stats?.pending ?? "-"}</TD>
              <TD align="right" className="hidden lg:table-cell">
                {batch.stats?.skipped ?? "-"}
              </TD>
              <TD truncate={false}>
                {batch.stats ? (
                  batch.stats.pending > 0 ? (
                    <Badge status="agInstalacao" label="PENDÊNCIAS" />
                  ) : (
                    <Badge status="gross" label="CONCLUÍDA" />
                  )
                ) : (
                  "-"
                )}
              </TD>
              <TD align="right" truncate={false}>
                {renderActions(batch)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <CardList footer={pagination}>
        {pageBatches.map((batch: ImportBatchRow) => (
          <CardItem
            key={batch.id}
            onClick={() => onSelect(batch.id)}
            actions={renderActions(batch)}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-body-medium text-primary">{batch.fileName}</span>
              {batch.stats ? (
                batch.stats.pending > 0 ? (
                  <Badge status="agInstalacao" label="PENDÊNCIAS" />
                ) : (
                  <Badge status="gross" label="CONCLUÍDA" />
                )
              ) : null}
            </span>
            <span className="text-caption text-muted">{formatInstantDate(batch.createdAt)}</span>
            {batch.stats ? (
              <span className="text-small text-secondary">
                {batch.stats.total} linhas · {batch.stats.pending} pendências
              </span>
            ) : null}
          </CardItem>
        ))}
      </CardList>

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
  const apiError = reprocess.error ? getErrorMessage(reprocess.error, "Erro ao reprocessar") : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <Table className="hidden sm:block">
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
              <TD emphasis>{row.raw[19] ?? "-"}</TD>
              <TD>{row.raw[17] ?? "-"}</TD>
              <TD truncate={false}>
                <Badge status={ROW_STATUS[row.status].badge} label={ROW_STATUS[row.status].label} />
              </TD>
              <TD>{row.message ?? "-"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <CardList>
        {detail.rows.map((row, index) => (
          <CardItem key={row.id}>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-caption text-muted">Nº {index + 1}</span>
              <Badge status={ROW_STATUS[row.status].badge} label={ROW_STATUS[row.status].label} />
            </span>
            {row.raw[19] ? (
              <span className="text-body-medium text-primary">{row.raw[19]}</span>
            ) : null}
            {row.raw[17] ? <span className="text-caption text-muted">{row.raw[17]}</span> : null}
            {row.message ? <span className="text-small text-secondary">{row.message}</span> : null}
          </CardItem>
        ))}
      </CardList>
    </section>
  );
}

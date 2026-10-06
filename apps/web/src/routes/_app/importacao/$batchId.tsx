import { BatchStatusBadge } from "@/components/imports/batch-status-badge";
import { ImportRowsTable } from "@/components/imports/import-rows-table";
import { PendingValuesCard } from "@/components/imports/pending-values-card";
import { PageAction, usePageMeta } from "@/components/shell/page-meta";
import { Button } from "@/components/ui";
import { useImportBatch } from "@/hooks/use-imports";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { formatInstantDate } from "@/lib/format";
import type { ImportBatchStats } from "@/lib/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/importacao/$batchId")({
  component: ImportBatchPage,
});

function ImportBatchPage() {
  const { batchId } = Route.useParams();
  const navigate = useNavigate();
  const canRun = usePermission("imports.run");
  const batch = useImportBatch(batchId, { enabled: canRun });
  const fileName = batch.data?.fileName;
  usePageMeta({
    title: fileName ? `Lote: ${fileName}` : "Lote",
    breadcrumb: fileName ? [APP_NAME, "Importação", fileName] : [APP_NAME, "Importação"],
  });

  if (!canRun) {
    return (
      <p className="text-body text-secondary">Você não tem permissão para executar importações.</p>
    );
  }

  if (!batch.data) {
    return (
      <p className="text-body text-secondary">
        {batch.isError ? getErrorMessage(batch.error, "Erro ao carregar o lote") : "Carregando..."}
      </p>
    );
  }

  const data = batch.data;
  const stats = data.stats;
  const hasPending = (stats?.pending ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageAction>
        <Button
          icon={ArrowLeft}
          collapseLabel
          variant="secondary"
          onClick={() => navigate({ to: "/importacao" })}
        >
          Voltar
        </Button>
      </PageAction>

      <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-h3 text-primary">Resumo do lote</h3>
            <span className="text-caption text-muted">
              Enviado por {data.importedBy.name} em {formatInstantDate(data.createdAt)}
            </span>
          </div>
          {stats ? <BatchStatusBadge pending={stats.pending} /> : null}
        </div>
        {stats ? <BatchStatsGrid stats={stats} /> : null}
      </section>

      {hasPending ? <PendingValuesCard batchId={data.id} /> : null}

      <ImportRowsTable batch={data} hasPending={hasPending} />
    </div>
  );
}

function BatchStatsGrid({ stats }: { stats: ImportBatchStats }) {
  const items = [
    { label: "Linhas", value: stats.total, tone: "text-primary" },
    { label: "Criadas", value: stats.created, tone: "text-success" },
    { label: "Atualizadas", value: stats.updated, tone: "text-info" },
    {
      label: "Pendências",
      value: stats.pending,
      tone: stats.pending > 0 ? "text-warning" : "text-primary",
    },
    { label: "Puladas", value: stats.skipped, tone: "text-primary" },
    { label: "Sem venda", value: stats.ignored ?? 0, tone: "text-muted" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 rounded-md border border-default bg-elevated px-4 py-3"
        >
          <dt className="text-eyebrow uppercase tracking-wide text-muted">{item.label}</dt>
          <dd className={`text-h2 ${item.value > 0 ? item.tone : "text-muted"}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

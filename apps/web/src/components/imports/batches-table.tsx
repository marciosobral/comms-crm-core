import {
  ActionMenu,
  ActionMenuItem,
  CardItem,
  CardList,
  Pagination,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { useImportBatches } from "@/hooks/use-imports";
import { useRowMenu } from "@/hooks/use-row-menu";
import { formatInstantDate } from "@/lib/format";
import type { ImportBatchRow } from "@/lib/types";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BatchStatusBadge } from "./batch-status-badge";

const BATCHES_PER_PAGE = 12;

export function BatchesTable() {
  const batches = useImportBatches();
  const navigate = useNavigate();
  const onSelect = (batchId: string) =>
    navigate({ to: "/importacao/$batchId", params: { batchId } });
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
                {batch.stats ? <BatchStatusBadge pending={batch.stats.pending} /> : "-"}
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
              {batch.stats ? <BatchStatusBadge pending={batch.stats.pending} /> : null}
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

      {batches.isError ? (
        <p className="text-caption text-danger">Erro ao carregar os lotes.</p>
      ) : batches.data && batches.data.length === 0 ? (
        <p className="text-body text-secondary">Nenhum lote importado.</p>
      ) : null}
    </section>
  );
}

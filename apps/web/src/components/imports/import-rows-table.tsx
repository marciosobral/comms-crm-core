import {
  Badge,
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
import { IMPORT_ROWS_PER_PAGE, downloadPendingCsv, useImportRows } from "@/hooks/use-imports";
import { getErrorMessage } from "@/lib/api";
import type { ImportRowItem, ImportRowStatus } from "@/lib/types";
import { Download } from "lucide-react";
import { useState } from "react";
import { ROW_STATUS, ROW_STATUS_FILTERS, isImportRowStatus } from "./labels";

const CUSTOMER_COLUMN = 19;
const CPF_COLUMN = 17;

export function ImportRowsTable({
  batch,
  hasPending,
}: {
  batch: { id: string; fileName: string };
  hasPending: boolean;
}) {
  const [status, setStatus] = useState<ImportRowStatus | "">("");
  const [page, setPage] = useState(1);
  const [downloadError, setDownloadError] = useState("");
  const rowsQuery = useImportRows(batch.id, status, page);

  const items = rowsQuery.data?.items ?? [];
  const total = rowsQuery.data?.total ?? 0;
  const perPage = rowsQuery.data?.perPage ?? IMPORT_ROWS_PER_PAGE;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  if (rowsQuery.data && page > lastPage) setPage(lastPage);
  const currentPage = rowsQuery.data?.page ?? page;
  const firstShown = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const lastShown = Math.min(currentPage * perPage, total);

  const pagination =
    total > 0 ? (
      <Pagination
        firstShown={firstShown}
        lastShown={lastShown}
        total={total}
        noun="linhas"
        hasPrevious={currentPage > 1}
        hasNext={lastShown < total}
        onPrevious={() => setPage(currentPage - 1)}
        onNext={() => setPage(currentPage + 1)}
      />
    ) : undefined;

  const onDownloadPending = () => {
    setDownloadError("");
    downloadPendingCsv(batch).catch((error: unknown) => {
      setDownloadError(getErrorMessage(error, "Erro ao baixar as pendências"));
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h3 text-primary">Linhas</h3>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Select
            id="import-rows-status"
            aria-label="Filtrar por status"
            className="w-full sm:w-44"
            value={status}
            onChange={(e) => {
              const value = e.target.value;
              if (value !== "" && !isImportRowStatus(value)) return;
              setStatus(value);
              setPage(1);
            }}
          >
            <option value="">Todos os status</option>
            {ROW_STATUS_FILTERS.map((option) => (
              <option key={option} value={option}>
                {ROW_STATUS[option].label}
              </option>
            ))}
          </Select>
          {hasPending ? (
            <Button variant="secondary" icon={Download} onClick={onDownloadPending}>
              Baixar pendências
            </Button>
          ) : null}
        </div>
      </div>

      {downloadError ? <p className="text-caption text-danger">{downloadError}</p> : null}

      <Table className="hidden sm:block" footer={pagination}>
        <colgroup>
          <col style={{ width: "7%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "50%" }} />
        </colgroup>
        <THead>
          <tr>
            <TH>Linha</TH>
            <TH>Cliente</TH>
            <TH>CPF</TH>
            <TH>Status</TH>
            <TH>Mensagem</TH>
          </tr>
        </THead>
        <TBody>
          {items.map((row: ImportRowItem) => (
            <TR key={row.id}>
              <TD className="py-3 align-top">{row.lineNumber ?? "-"}</TD>
              <TD emphasis truncate={false} className="break-words py-3 align-top">
                {row.raw[CUSTOMER_COLUMN] ?? "-"}
              </TD>
              <TD className="py-3 align-top">{row.raw[CPF_COLUMN] ?? "-"}</TD>
              <TD truncate={false} className="py-3 align-top">
                <Badge status={ROW_STATUS[row.status].badge} label={ROW_STATUS[row.status].label} />
              </TD>
              <TD truncate={false} className="whitespace-normal break-words py-3 align-top">
                {row.message ?? "-"}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <CardList footer={pagination}>
        {items.map((row: ImportRowItem) => (
          <CardItem key={row.id}>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-caption text-muted">Linha {row.lineNumber ?? "-"}</span>
              <Badge status={ROW_STATUS[row.status].badge} label={ROW_STATUS[row.status].label} />
            </span>
            {row.raw[CUSTOMER_COLUMN] ? (
              <span className="text-body-medium text-primary">{row.raw[CUSTOMER_COLUMN]}</span>
            ) : null}
            {row.raw[CPF_COLUMN] ? (
              <span className="text-caption text-muted">{row.raw[CPF_COLUMN]}</span>
            ) : null}
            {row.message ? (
              <span className="break-words text-small text-secondary">{row.message}</span>
            ) : null}
          </CardItem>
        ))}
      </CardList>

      {rowsQuery.data && items.length === 0 ? (
        <p className="text-body text-secondary">Nenhuma linha encontrada.</p>
      ) : null}
    </section>
  );
}

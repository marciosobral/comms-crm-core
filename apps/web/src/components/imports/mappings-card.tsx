import {
  ActionMenu,
  ActionMenuItem,
  CardItem,
  CardList,
  ConfirmDialog,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { useDeleteImportMapping, useImportMappings } from "@/hooks/use-imports";
import { useRowMenu } from "@/hooks/use-row-menu";
import { getErrorMessage } from "@/lib/api";
import type { ImportMappingRow } from "@/lib/types";
import { useState } from "react";
import { mappingKindLabel } from "./labels";

export function MappingsCard() {
  const mappings = useImportMappings();
  const deleteMapping = useDeleteImportMapping();
  const rowMenu = useRowMenu();
  const [confirmDelete, setConfirmDelete] = useState<ImportMappingRow | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const rows = mappings.data ?? [];

  const onDelete = () => {
    if (!confirmDelete) return;
    setDeleteError("");
    deleteMapping.mutate(confirmDelete.id, {
      onSuccess: () => setConfirmDelete(null),
      onError: (error) => {
        setConfirmDelete(null);
        setDeleteError(getErrorMessage(error, "Erro ao remover o mapeamento"));
      },
    });
  };

  const renderActions = (mapping: ImportMappingRow) => (
    <ActionMenu
      label={`Ações para ${mapping.sourceValue}`}
      open={rowMenu.isOpen(mapping.id)}
      onOpenChange={rowMenu.onOpenChange(mapping.id)}
      menuClassName="w-36"
    >
      <ActionMenuItem
        danger
        onClick={() => {
          rowMenu.close();
          setConfirmDelete(mapping);
        }}
      >
        Remover
      </ActionMenuItem>
    </ActionMenu>
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-h3 text-primary">Mapeamentos</h3>
        <p className="text-caption text-muted">
          Valores da planilha já vinculados a usuários, planos e valores de cadastro.
        </p>
      </div>

      {deleteError ? <p className="text-caption text-danger">{deleteError}</p> : null}

      <Table className="hidden sm:block">
        <THead>
          <tr>
            <TH>Na planilha</TH>
            <TH>Tipo</TH>
            <TH>Vinculado a</TH>
            <TH align="right">Ações</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((mapping) => (
            <TR key={mapping.id}>
              <TD emphasis>{mapping.sourceValue}</TD>
              <TD>{mappingKindLabel(mapping.kind, mapping.domainType)}</TD>
              <TD>{mapping.targetLabel ?? "-"}</TD>
              <TD align="right" truncate={false}>
                {renderActions(mapping)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <CardList>
        {rows.map((mapping) => (
          <CardItem key={mapping.id} actions={renderActions(mapping)}>
            <span className="text-body-medium text-primary">{mapping.sourceValue}</span>
            <span className="text-caption text-muted">
              {mappingKindLabel(mapping.kind, mapping.domainType)}
            </span>
            <span className="text-small text-secondary">{mapping.targetLabel ?? "-"}</span>
          </CardItem>
        ))}
      </CardList>

      {mappings.isError ? (
        <p className="text-caption text-danger">Erro ao carregar os mapeamentos.</p>
      ) : mappings.data && mappings.data.length === 0 ? (
        <p className="text-body text-secondary">Nenhum mapeamento cadastrado.</p>
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remover mapeamento"
        message={`Remover o mapeamento de "${confirmDelete?.sourceValue ?? ""}"? Nas próximas importações o valor voltará a ficar pendente.`}
        confirmLabel="Remover"
        danger
        loading={deleteMapping.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={onDelete}
      />
    </section>
  );
}

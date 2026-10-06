import { Badge, Button, Select } from "@/components/ui";
import {
  useCreateImportMapping,
  useImportUnresolved,
  useReprocessBatch,
} from "@/hooks/use-imports";
import { getErrorMessage } from "@/lib/api";
import type { ImportUnresolved, ImportUnresolvedValue } from "@/lib/types";
import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { fieldsLabel } from "./labels";
import { suggestTarget } from "./suggest-target";

interface LinkedValue {
  key: string;
  value: ImportUnresolvedValue;
  targetLabel: string;
}

interface TargetOption {
  id: string;
  label: string;
}

function optionsFor(value: ImportUnresolvedValue, options: ImportUnresolved["options"]) {
  if (value.kind === "USER") {
    return options.users.map((user): TargetOption => ({ id: user.id, label: user.name }));
  }
  if (value.kind === "PLAN") {
    return options.plans.map((plan): TargetOption => ({ id: plan.id, label: plan.name }));
  }
  if (value.domainType === null) return [];
  return options.domainValues[value.domainType].map(
    (item): TargetOption => ({ id: item.id, label: item.value }),
  );
}

function valueKey(value: ImportUnresolvedValue): string {
  return `${value.kind}|${value.domainType ?? ""}|${value.sourceValue}`;
}

function LinkedValueLine({ linked }: { linked: LinkedValue }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-caption text-muted">{fieldsLabel(linked.value.fields)}</span>
        <span className="break-words text-body-medium text-primary">
          {linked.value.sourceValue}
        </span>
        <span className="text-caption text-secondary">Vinculado a {linked.targetLabel}</span>
      </div>
    </div>
  );
}

function PendingValueLine({
  value,
  options,
  onLinked,
}: {
  value: ImportUnresolvedValue;
  options: ImportUnresolved["options"];
  onLinked: (linked: LinkedValue) => void;
}) {
  const createMapping = useCreateImportMapping();
  const targets = optionsFor(value, options);
  const [suggestedId] = useState(() => suggestTarget(value.sourceValue, targets));
  const [targetId, setTargetId] = useState(suggestedId ?? "");
  const selectId = `pending-${valueKey(value)}`;

  const onLink = () => {
    if (!targetId) return;
    const targetLabel = targets.find((target) => target.id === targetId)?.label ?? "";
    createMapping.mutate(
      {
        kind: value.kind,
        domainType: value.domainType ?? undefined,
        sourceValue: value.sourceValue,
        targetId,
      },
      { onSuccess: () => onLinked({ key: valueKey(value), value, targetLabel }) },
    );
  };

  const apiError = createMapping.error
    ? getErrorMessage(createMapping.error, "Erro ao vincular o valor")
    : null;

  return (
    <div className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted">{fieldsLabel(value.fields)}</span>
          {value.blocking ? null : <Badge status="inativo" label="AVISO" />}
          {suggestedId !== null && targetId === suggestedId ? (
            <Badge status="agBiometria" label="SUGESTÃO" />
          ) : null}
        </span>
        <span className="break-words text-body-medium text-primary">{value.sourceValue}</span>
        <span className="text-caption text-muted">
          {value.rows} {value.rows === 1 ? "linha" : "linhas"}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:w-96">
        <div className="flex-1">
          <Select
            id={selectId}
            aria-label={`Vincular ${value.sourceValue} a`}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant={targetId ? "primary" : "secondary"}
          disabled={!targetId}
          loading={createMapping.isPending}
          onClick={onLink}
        >
          Vincular
        </Button>
      </div>
      {apiError ? <p className="text-caption text-danger lg:basis-full">{apiError}</p> : null}
    </div>
  );
}

export function PendingValuesCard({ batchId }: { batchId: string }) {
  const unresolved = useImportUnresolved(batchId);
  const reprocess = useReprocessBatch();
  const [resolvedCount, setResolvedCount] = useState<number | null>(null);
  const [linked, setLinked] = useState<LinkedValue[]>([]);

  const onLinked = (entry: LinkedValue) => setLinked((current) => [...current, entry]);

  const onReprocess = () => {
    setResolvedCount(null);
    reprocess.mutate(batchId, {
      onSuccess: (result) => {
        setResolvedCount(result.resolved);
        setLinked([]);
      },
    });
  };

  const apiError = reprocess.error ? getErrorMessage(reprocess.error, "Erro ao reprocessar") : null;
  const data = unresolved.data;
  const linkedKeys = new Set(linked.map((entry) => entry.key));
  const remaining = data ? data.values.filter((value) => !linkedKeys.has(valueKey(value))) : [];
  const hasValues = linked.length > 0 || remaining.length > 0;
  const reprocessLabel =
    linked.length > 0
      ? `Reprocessar pendências (${linked.length} ${linked.length === 1 ? "novo vínculo" : "novos vínculos"})`
      : "Reprocessar pendências";

  const renderBody = () => {
    if (!data) {
      return unresolved.isError ? (
        <p className="text-caption text-danger">Erro ao carregar as pendências.</p>
      ) : null;
    }
    if (!hasValues) {
      return (
        <p className="text-body text-secondary">
          Nenhum valor sem vínculo. Reprocesse para atualizar as linhas pendentes.
        </p>
      );
    }
    return (
      <div className="flex flex-col divide-y divide-subtle">
        {linked.map((entry) => (
          <LinkedValueLine key={entry.key} linked={entry} />
        ))}
        {remaining.map((value) => (
          <PendingValueLine
            key={valueKey(value)}
            value={value}
            options={data.options}
            onLinked={onLinked}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-h3 text-primary">Pendências deste lote</h3>
          <p className="text-caption text-muted">
            Vincule cada valor ao cadastro correspondente e reprocesse as pendências.
          </p>
          {hasValues ? (
            <p className="text-caption text-secondary">
              {linked.length} de {linked.length + remaining.length} valores vinculados
            </p>
          ) : null}
        </div>
        <Button
          variant={linked.length > 0 ? "primary" : "secondary"}
          loading={reprocess.isPending}
          onClick={onReprocess}
        >
          {reprocessLabel}
        </Button>
      </div>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
      {resolvedCount !== null ? (
        <p className="text-caption text-secondary">
          {resolvedCount} {resolvedCount === 1 ? "linha resolvida" : "linhas resolvidas"}.
        </p>
      ) : null}

      {renderBody()}
    </section>
  );
}

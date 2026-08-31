import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { useCreateDomainValue, useUpdateDomainValue } from "@/hooks/use-settings";
import { ApiError } from "@/lib/api";
import type { DomainType, DomainValue } from "@/lib/types";
import { useState } from "react";

export function DomainValueModal({
  type,
  value,
  onClose,
}: {
  type: DomainType;
  value: DomainValue | null;
  onClose: () => void;
}) {
  const createValue = useCreateDomainValue();
  const updateValue = useUpdateDomainValue();
  const mutation = value ? updateValue : createValue;

  const [text, setText] = useState(value?.value ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [order, setOrder] = useState(String(value?.order ?? 0));
  const [textError, setTextError] = useState("");

  const onSubmit = () => {
    if (!text.trim()) {
      setTextError("Informe o valor");
      return;
    }
    setTextError("");
    const parsedOrder = Number(order);
    if (value) {
      updateValue.mutate(
        {
          id: value.id,
          value: text.trim(),
          description: description.trim() || undefined,
          order: Number.isNaN(parsedOrder) ? undefined : parsedOrder,
        },
        { onSuccess: onClose },
      );
    } else {
      createValue.mutate(
        {
          type,
          value: text.trim(),
          description: description.trim() || undefined,
          order: Number.isNaN(parsedOrder) ? undefined : parsedOrder,
        },
        { onSuccess: onClose },
      );
    }
  };

  const apiError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <Modal
      open
      title={value ? "Editar valor" : "Adicionar valor"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <Field label="Valor" htmlFor="domain-value-text" error={textError || undefined}>
        <Input id="domain-value-text" value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Field label="Descrição" htmlFor="domain-value-description">
        <Textarea
          id="domain-value-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Ordem" htmlFor="domain-value-order">
        <Input
          id="domain-value-order"
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        />
      </Field>
      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
    </Modal>
  );
}

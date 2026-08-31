import { Button, Field, Modal, Select, Textarea } from "@/components/ui";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { useCancelSale, useSetSaleSeller, useSetSaleStatus } from "@/hooks/use-sales";
import { useUsers } from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import type { SaleDetail } from "@/lib/types";
import { useState } from "react";

type Dialog = "status" | "seller" | "cancel" | null;

export function SaleActions({
  sale,
  canChangeStatus,
  canChangeSeller,
}: {
  sale: SaleDetail;
  canChangeStatus: boolean;
  canChangeSeller: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [statusId, setStatusId] = useState(sale.status.id);
  const [sellerId, setSellerId] = useState(sale.seller.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const statuses = useActiveDomainValues("SALE_STATUS");
  const users = useUsers();
  const setStatus = useSetSaleStatus();
  const setSeller = useSetSaleSeller();
  const cancelSale = useCancelSale();

  const close = () => {
    setDialog(null);
    setError("");
    setReason("");
  };
  const onError = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : "Erro ao salvar");

  const isCanceled = sale.canceledAt !== null;

  return (
    <div className="flex gap-3">
      {canChangeStatus && !isCanceled ? (
        <Button variant="secondary" onClick={() => setDialog("status")}>
          Mudar status
        </Button>
      ) : null}
      {canChangeSeller && !isCanceled ? (
        <Button variant="secondary" onClick={() => setDialog("seller")}>
          Mudar vendedor
        </Button>
      ) : null}
      {canChangeStatus && !isCanceled ? (
        <Button variant="danger" onClick={() => setDialog("cancel")}>
          Cancelar venda
        </Button>
      ) : null}

      <Modal
        open={dialog === "status"}
        title="Mudar status"
        onClose={close}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              loading={setStatus.isPending}
              onClick={() =>
                setStatus.mutate({ id: sale.id, statusId }, { onSuccess: close, onError })
              }
            >
              Salvar
            </Button>
          </>
        }
      >
        <Field label="Novo status" htmlFor="a-status">
          <Select id="a-status" value={statusId} onChange={(e) => setStatusId(e.target.value)}>
            {(statuses.data ?? []).map((status) => (
              <option key={status.id} value={status.id}>
                {status.value}
              </option>
            ))}
          </Select>
        </Field>
        {error ? <p className="text-caption text-danger">{error}</p> : null}
      </Modal>

      <Modal
        open={dialog === "seller"}
        title="Mudar vendedor"
        onClose={close}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              loading={setSeller.isPending}
              onClick={() =>
                setSeller.mutate({ id: sale.id, sellerId }, { onSuccess: close, onError })
              }
            >
              Salvar
            </Button>
          </>
        }
      >
        <Field label="Novo vendedor" htmlFor="a-seller">
          <Select id="a-seller" value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
            {(users.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </Field>
        {error ? <p className="text-caption text-danger">{error}</p> : null}
      </Modal>

      <Modal
        open={dialog === "cancel"}
        title="Cancelar venda"
        onClose={close}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Voltar
            </Button>
            <Button
              variant="danger"
              loading={cancelSale.isPending}
              onClick={() => {
                if (!reason.trim()) {
                  setError("Informe o motivo do cancelamento");
                  return;
                }
                cancelSale.mutate(
                  { id: sale.id, reason: reason.trim() },
                  { onSuccess: close, onError },
                );
              }}
            >
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        <Field label="Motivo do cancelamento" htmlFor="a-reason">
          <Textarea id="a-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {error ? <p className="text-caption text-danger">{error}</p> : null}
      </Modal>
    </div>
  );
}

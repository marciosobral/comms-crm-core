import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import {
  useAssignablePeople,
  useCancelSale,
  useSetSaleAudit,
  useSetSaleBrscan,
  useSetSaleSeller,
  useSetSaleStatus,
  useUpdateSale,
} from "@/hooks/use-sales";
import { ApiError } from "@/lib/api";
import type { SaleDetail } from "@/lib/types";
import { useState } from "react";
import { userOptions } from "./sale-form/domain-options";

type Dialog = "status" | "seller" | "cancel" | "installation" | null;

export function SaleActions({
  sale,
  canChangeStatus,
  canChangeSeller,
  canAudit,
  canEdit,
}: {
  sale: SaleDetail;
  canChangeStatus: boolean;
  canChangeSeller: boolean;
  canAudit: boolean;
  canEdit: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [statusId, setStatusId] = useState(sale.status.id);
  const [sellerId, setSellerId] = useState(sale.seller.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const statuses = useActiveDomainValues("SALE_STATUS");
  const people = useAssignablePeople();
  const setStatus = useSetSaleStatus();
  const setSeller = useSetSaleSeller();
  const cancelSale = useCancelSale();
  const setAudit = useSetSaleAudit();
  const setBrscan = useSetSaleBrscan();
  const updateSale = useUpdateSale();
  const [installedAt, setInstalledAt] = useState(sale.installedAt?.slice(0, 10) ?? "");

  const close = () => {
    setDialog(null);
    setError("");
    setReason("");
  };
  const onError = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : "Erro ao salvar");

  const isCanceled = sale.canceledAt !== null;
  const auditOk = sale.auditNote?.toUpperCase() === "OK";

  return (
    <div className="flex gap-3">
      {canAudit && !isCanceled ? (
        <Button
          variant="secondary"
          loading={setAudit.isPending}
          onClick={() => setAudit.mutate({ id: sale.id, ok: !auditOk })}
        >
          {auditOk ? "Desfazer auditoria" : "Marcar auditoria OK"}
        </Button>
      ) : null}
      {canAudit && !isCanceled ? (
        <Button
          variant="secondary"
          loading={setBrscan.isPending}
          onClick={() => setBrscan.mutate({ id: sale.id, approved: sale.brscan !== true })}
        >
          {sale.brscan === true ? "Desfazer BRScan" : "Marcar BRScan aprovado"}
        </Button>
      ) : null}
      {canEdit && !isCanceled ? (
        <Button
          variant="secondary"
          onClick={() => {
            setInstalledAt(sale.installedAt?.slice(0, 10) ?? "");
            setDialog("installation");
          }}
        >
          {sale.installedAt ? "Alterar instalação" : "Informar instalação"}
        </Button>
      ) : null}
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
        open={dialog === "installation"}
        title="Data da instalação"
        onClose={close}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              loading={updateSale.isPending}
              onClick={() =>
                updateSale.mutate(
                  { id: sale.id, installedAt: installedAt || null },
                  { onSuccess: close, onError },
                )
              }
            >
              Salvar
            </Button>
          </>
        }
      >
        <Field optional label="Data da instalação" htmlFor="a-installed">
          <Input
            id="a-installed"
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            value={installedAt}
            onChange={(e) => setInstalledAt(e.target.value)}
          />
        </Field>
        {sale.installedAt ? (
          <p className="text-caption text-muted">Deixe em branco e salve para remover a data.</p>
        ) : null}
        {error ? <p className="text-caption text-danger">{error}</p> : null}
      </Modal>

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
            {userOptions(people.data?.SELLER, sale.seller)}
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

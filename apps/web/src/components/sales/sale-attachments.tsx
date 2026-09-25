import { ConfirmDialog } from "@/components/ui";
import {
  downloadAttachment,
  useDeleteAttachment,
  useUploadAttachment,
} from "@/hooks/use-attachments";
import { ApiError } from "@/lib/api";
import { ATTACHMENT_KIND_OPTIONS } from "@/lib/attachment-kinds";
import { formatDate } from "@/lib/format";
import type { AttachmentKind, SaleAttachment, SaleDetail } from "@/lib/types";
import { Download, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function AttachmentRow({
  attachment,
  canRemove,
  removing,
  onRemove,
}: {
  attachment: SaleAttachment;
  canRemove: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-subtle bg-base px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-small text-primary" title={attachment.fileName}>
          {attachment.fileName}
        </span>
        <span className="truncate text-caption text-muted">
          {formatSize(attachment.size)} · {attachment.uploadedBy.name} ·{" "}
          {formatDate(attachment.createdAt)}
        </span>
      </div>
      <button
        type="button"
        aria-label={`Baixar ${attachment.fileName}`}
        title="Baixar"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-surface-hover hover:text-primary"
        onClick={() => downloadAttachment(attachment.id, attachment.fileName)}
      >
        <Download className="h-4 w-4" aria-hidden />
      </button>
      {canRemove ? (
        <button
          type="button"
          aria-label={`Remover ${attachment.fileName}`}
          title="Remover"
          disabled={removing}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-surface-hover hover:text-danger disabled:opacity-50"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

export function SaleAttachments({
  sale,
  canEdit,
  canUpload,
}: {
  sale: SaleDetail;
  canEdit: boolean;
  canUpload: boolean;
}) {
  const upload = useUploadAttachment();
  const removeAttachment = useDeleteAttachment();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const [pendingKind, setPendingKind] = useState<AttachmentKind>("OTHER");
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; fileName: string } | null>(null);

  const openPicker = (kind: AttachmentKind) => {
    setPendingKind(kind);
    const input = fileInput.current;
    if (!input) return;
    input.accept = ATTACHMENT_KIND_OPTIONS.find((option) => option.value === kind)?.accept ?? "";
    input.click();
  };

  const onPick = (file: File | undefined) => {
    if (!file) return;
    setError("");
    upload.mutate(
      { saleId: sale.id, file, kind: pendingKind },
      { onError: (err) => setError(err instanceof ApiError ? err.message : "Erro no upload") },
    );
    if (fileInput.current) fileInput.current.value = "";
  };

  const onConfirmRemove = () => {
    if (!confirmRemove) return;
    removeAttachment.mutate(
      { id: confirmRemove.id, saleId: sale.id },
      { onSuccess: () => setConfirmRemove(null) },
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Anexos</h3>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {error ? <p className="text-caption text-danger">{error}</p> : null}

      {ATTACHMENT_KIND_OPTIONS.map((option) => {
        const files = sale.attachments.filter((attachment) => attachment.kind === option.value);
        const uploadingHere = upload.isPending && pendingKind === option.value;
        return (
          <div key={option.value} className="flex flex-col gap-2">
            <span className="text-small text-secondary">{option.label}</span>
            {files.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {files.map((attachment) => (
                  <AttachmentRow
                    key={attachment.id}
                    attachment={attachment}
                    canRemove={canEdit}
                    removing={removeAttachment.isPending}
                    onRemove={() =>
                      setConfirmRemove({ id: attachment.id, fileName: attachment.fileName })
                    }
                  />
                ))}
              </ul>
            ) : null}
            {canUpload ? (
              <button
                type="button"
                disabled={upload.isPending}
                onClick={() => openPicker(option.value)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-default text-small text-secondary transition-colors hover:border-strong hover:text-primary disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {uploadingHere ? "Enviando..." : option.addLabel}
              </button>
            ) : files.length === 0 ? (
              <p className="text-caption text-muted">Nenhum arquivo.</p>
            ) : null}
          </div>
        );
      })}

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remover anexo"
        message={`Remover o anexo "${confirmRemove?.fileName ?? ""}"?`}
        confirmLabel="Remover"
        danger
        loading={removeAttachment.isPending}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={onConfirmRemove}
      />
    </section>
  );
}

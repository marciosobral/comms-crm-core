import { Button } from "@/components/ui";
import {
  downloadAttachment,
  useDeleteAttachment,
  useUploadAttachment,
} from "@/hooks/use-attachments";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { SaleDetail } from "@/lib/types";
import { Paperclip } from "lucide-react";
import { useRef, useState } from "react";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function SaleAttachments({ sale, canEdit }: { sale: SaleDetail; canEdit: boolean }) {
  const upload = useUploadAttachment();
  const removeAttachment = useDeleteAttachment();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  const onPick = (file: File | undefined) => {
    if (!file) return;
    setError("");
    upload.mutate(
      { saleId: sale.id, file },
      { onError: (err) => setError(err instanceof ApiError ? err.message : "Erro no upload") },
    );
    if (fileInput.current) fileInput.current.value = "";
  };

  const onRemove = (id: string, fileName: string) => {
    if (!window.confirm(`Remover o anexo "${fileName}"?`)) return;
    removeAttachment.mutate({ id, saleId: sale.id });
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-primary">Anexos</h3>
        {canEdit ? (
          <>
            <input
              ref={fileInput}
              type="file"
              accept=".png,.jpg,.jpeg,.mp3,.pdf"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              icon={Paperclip}
              loading={upload.isPending}
              onClick={() => fileInput.current?.click()}
            >
              Anexar arquivo
            </Button>
          </>
        ) : null}
      </div>

      {error ? <p className="text-caption text-danger">{error}</p> : null}

      {sale.attachments.length === 0 ? (
        <p className="text-body text-secondary">Nenhum anexo.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sale.attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between rounded-md border border-subtle bg-base px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-body text-primary">{attachment.fileName}</span>
                <span className="text-caption text-muted">
                  {formatSize(attachment.size)} · {attachment.uploadedBy.name} ·{" "}
                  {formatDate(attachment.createdAt)}
                </span>
              </div>
              <div className="flex shrink-0 gap-3">
                <Button
                  variant="ghost"
                  onClick={() => downloadAttachment(attachment.id, attachment.fileName)}
                >
                  Baixar
                </Button>
                {canEdit ? (
                  <Button
                    variant="danger"
                    disabled={removeAttachment.isPending}
                    onClick={() => onRemove(attachment.id, attachment.fileName)}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

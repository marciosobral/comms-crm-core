import { PageAction } from "@/components/shell/page-meta";
import { Button, Field } from "@/components/ui";
import { downloadImportTemplate, useUploadImport } from "@/hooks/use-imports";
import { getErrorMessage } from "@/lib/api";
import { useNavigate } from "@tanstack/react-router";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

export function UploadCard() {
  const upload = useUploadImport();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [templateError, setTemplateError] = useState("");

  const onSubmit = () => {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: (batch) => {
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
        navigate({ to: "/importacao/$batchId", params: { batchId: batch.id } });
      },
    });
  };

  const onDownloadTemplate = () => {
    setTemplateError("");
    downloadImportTemplate().catch((error: unknown) => {
      setTemplateError(getErrorMessage(error, "Erro ao baixar o modelo"));
    });
  };

  const apiError = upload.error ? getErrorMessage(upload.error, "Erro ao enviar a planilha") : null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-4 sm:p-6">
      <PageAction>
        <Button variant="secondary" icon={Download} collapseLabel onClick={onDownloadTemplate}>
          Baixar modelo
        </Button>
      </PageAction>
      <h3 className="text-h3 text-primary">Importar planilha</h3>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Arquivo" htmlFor="import-file">
            <input
              ref={fileInput}
              id="import-file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              {file ? file.name : "Escolher arquivo"}
            </Button>
          </Field>
        </div>

        <Button
          className="w-full sm:w-auto"
          icon={Upload}
          disabled={!file}
          loading={upload.isPending}
          onClick={onSubmit}
        >
          Importar planilha
        </Button>
      </div>

      {apiError ? <p className="text-caption text-danger">{apiError}</p> : null}
      {templateError ? <p className="text-caption text-danger">{templateError}</p> : null}
    </section>
  );
}

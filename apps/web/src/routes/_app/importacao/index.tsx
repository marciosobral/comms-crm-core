import { BatchesTable } from "@/components/imports/batches-table";
import { MappingsCard } from "@/components/imports/mappings-card";
import { UploadCard } from "@/components/imports/upload-card";
import { usePageMeta } from "@/components/shell/page-meta";
import { usePermission } from "@/hooks/use-permission";
import { APP_NAME } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/importacao/")({
  component: ImportPage,
});

function ImportPage() {
  usePageMeta({ title: "Importação", breadcrumb: [APP_NAME, "Importação"] });

  const canRun = usePermission("imports.run");

  if (!canRun) {
    return (
      <p className="text-body text-secondary">Você não tem permissão para executar importações.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <UploadCard />
      <BatchesTable />
      <MappingsCard />
    </div>
  );
}

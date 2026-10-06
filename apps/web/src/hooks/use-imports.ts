import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/csv";
import { importsKeys } from "@/lib/query-keys";
import { toQueryString } from "@/lib/query-string";
import type {
  ImportBatchDetail,
  ImportBatchRow,
  ImportMappingRow,
  ImportRowStatus,
  ImportRowsPage,
  ImportUnresolved,
  ImportUploadResult,
} from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const IMPORT_ROWS_PER_PAGE = 50;

export function useImportBatches(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: importsKeys.batches,
    queryFn: () => api.get<ImportBatchRow[]>("/imports"),
    enabled: options?.enabled ?? true,
  });
}

export function useImportBatch(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: importsKeys.batch(id),
    queryFn: () => api.get<ImportBatchDetail>(`/imports/${id}`),
    enabled: options?.enabled ?? true,
  });
}

export function useImportRows(id: string, status: ImportRowStatus | "", page: number) {
  return useQuery({
    queryKey: importsKeys.rows(id, status, page),
    queryFn: () =>
      api.get<ImportRowsPage>(
        `/imports/${id}/rows${toQueryString({ status, page, perPage: IMPORT_ROWS_PER_PAGE })}`,
      ),
    placeholderData: (previous) => previous,
  });
}

export function useImportUnresolved(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: importsKeys.unresolved(id),
    queryFn: () => api.get<ImportUnresolved>(`/imports/${id}/unresolved`),
    enabled: options?.enabled ?? true,
  });
}

export function useUploadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<ImportUploadResult>("/imports", formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: importsKeys.batches }),
  });
}

export function useReprocessBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ id: string; resolved: number }>(`/imports/${id}/reprocess`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: importsKeys.batches });
      queryClient.invalidateQueries({ queryKey: importsKeys.batch(id) });
      queryClient.invalidateQueries({ queryKey: importsKeys.anyRows });
      queryClient.invalidateQueries({ queryKey: importsKeys.unresolved(id) });
    },
  });
}

export function useImportMappings() {
  return useQuery({
    queryKey: importsKeys.mappings,
    queryFn: () => api.get<ImportMappingRow[]>("/imports/mappings"),
  });
}

export function useCreateImportMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      kind: ImportMappingRow["kind"];
      domainType?: ImportMappingRow["domainType"];
      sourceValue: string;
      targetId: string;
    }) => api.post<ImportMappingRow>("/imports/mappings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importsKeys.mappings });
      queryClient.invalidateQueries({ queryKey: importsKeys.anyUnresolved });
    },
  });
}

export function useDeleteImportMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<ImportMappingRow>(`/imports/mappings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importsKeys.mappings });
      queryClient.invalidateQueries({ queryKey: importsKeys.anyUnresolved });
    },
  });
}

export async function downloadImportTemplate(): Promise<void> {
  const blob = await api.download("/imports/template.csv");
  downloadBlob(blob, "modelo-importacao.csv");
}

export async function downloadPendingCsv(batch: { id: string; fileName: string }): Promise<void> {
  const blob = await api.download(`/imports/${batch.id}/pending.csv`);
  downloadBlob(blob, `pendencias-${batch.fileName.replace(/\.[^.]*$/, "")}.csv`);
}

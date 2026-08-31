import { api } from "@/lib/api";
import type { ImportBatchDetail, ImportBatchRow, ImportMappingRow } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useImportBatches(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["import-batches"],
    queryFn: () => api.get<ImportBatchRow[]>("/imports"),
    enabled: options?.enabled ?? true,
  });
}

export function useImportBatch(id: string | null) {
  return useQuery({
    queryKey: ["import-batch", id],
    queryFn: () => api.get<ImportBatchDetail>(`/imports/${id}`),
    enabled: id !== null,
  });
}

export function useUploadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, year }: { file: File; year: number }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("year", String(year));
      return api.upload<ImportBatchRow>("/imports", formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["import-batches"] }),
  });
}

export function useReprocessBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ id: string; resolved: number }>(`/imports/${id}/reprocess`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });
      queryClient.invalidateQueries({ queryKey: ["import-batch", id] });
    },
  });
}

export function useImportMappings() {
  return useQuery({
    queryKey: ["import-mappings"],
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["import-mappings"] }),
  });
}

import { api } from "@/lib/api";
import type { AttachmentKind, SaleAttachment } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, file, kind }: { saleId: string; file: File; kind: AttachmentKind }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      return api.upload<SaleAttachment>(`/sales/${saleId}/attachments`, formData);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sale", vars.saleId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; saleId: string }) => api.delete<void>(`/attachments/${id}`),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sale", vars.saleId] });
    },
  });
}

export async function downloadAttachment(id: string, fileName: string): Promise<void> {
  const blob = await api.download(`/attachments/${id}`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

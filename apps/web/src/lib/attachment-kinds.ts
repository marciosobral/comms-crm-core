import type { AttachmentKind } from "./types";

export const AUDIO_ACCEPT = ".mp3,.ogg,.opus,.m4a,.wav";
export const DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg";

export const ATTACHMENT_KIND_OPTIONS: Array<{
  value: AttachmentKind;
  label: string;
  accept: string;
}> = [
  { value: "AUDIO", label: "Áudio da venda", accept: AUDIO_ACCEPT },
  { value: "PROOF_OF_ADDRESS", label: "Comprovante de endereço", accept: DOCUMENT_ACCEPT },
  { value: "OTHER", label: "Outro", accept: `${DOCUMENT_ACCEPT},${AUDIO_ACCEPT}` },
];

export function attachmentKindLabel(kind: AttachmentKind): string {
  return ATTACHMENT_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Outro";
}

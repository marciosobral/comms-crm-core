import type { AttachmentKind } from "./types";

export const AUDIO_ACCEPT = ".mp3,.ogg,.opus,.m4a,.wav";
export const DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg";

export const ATTACHMENT_KIND_OPTIONS: Array<{
  value: AttachmentKind;
  label: string;
  addLabel: string;
  accept: string;
}> = [
  { value: "AUDIO", label: "Áudio da venda", addLabel: "Adicionar áudio", accept: AUDIO_ACCEPT },
  {
    value: "PROOF_OF_ADDRESS",
    label: "Comprovante de endereço",
    addLabel: "Adicionar comprovante",
    accept: DOCUMENT_ACCEPT,
  },
  {
    value: "OTHER",
    label: "Outros",
    addLabel: "Adicionar arquivo",
    accept: `${DOCUMENT_ACCEPT},${AUDIO_ACCEPT}`,
  },
];

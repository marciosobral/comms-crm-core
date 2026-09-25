import { Field } from "@/components/ui";
import { AUDIO_ACCEPT, DOCUMENT_ACCEPT } from "@/lib/attachment-kinds";
import { FilePicker } from "../file-picker";

export function AttachmentsSection({
  audioFile,
  onAudioFileChange,
  proofOfAddressFile,
  onProofOfAddressFileChange,
}: {
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
  proofOfAddressFile: File | null;
  onProofOfAddressFileChange: (file: File | null) => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Anexos</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field optional label="Áudio da venda" htmlFor="s-audio">
          <FilePicker
            id="s-audio"
            accept={AUDIO_ACCEPT}
            file={audioFile}
            onChange={onAudioFileChange}
          />
        </Field>
        <Field optional label="Comprovante de endereço" htmlFor="s-proof">
          <FilePicker
            id="s-proof"
            accept={DOCUMENT_ACCEPT}
            file={proofOfAddressFile}
            onChange={onProofOfAddressFileChange}
          />
        </Field>
      </div>
      <p className="text-caption text-muted">
        Os arquivos são enviados depois que a venda for salva.
      </p>
    </section>
  );
}

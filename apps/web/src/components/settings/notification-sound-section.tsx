import { Button } from "@/components/ui";
import { useNotificationSound } from "@/hooks/use-notifications";
import {
  useNotificationSoundInfo,
  useRemoveNotificationSound,
  useUploadNotificationSound,
} from "@/hooks/use-settings";
import { ApiError } from "@/lib/api";
import { formatFileSize } from "@/lib/format";
import { playSound } from "@/lib/notification-sound";
import { Play, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

export function NotificationSoundSection() {
  const infoQuery = useNotificationSoundInfo();
  const soundQuery = useNotificationSound();
  const upload = useUploadNotificationSound();
  const remove = useRemoveNotificationSound();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  const sound = infoQuery.data?.sound ?? null;

  const onPick = (file: File | undefined) => {
    if (!file) return;
    setError("");
    upload.mutate(file, {
      onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao enviar o som"),
    });
    if (fileInput.current) fileInput.current.value = "";
  };

  const onRemove = () => {
    setError("");
    remove.mutate(undefined, {
      onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao remover o som"),
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-default bg-surface p-6">
      <h3 className="text-h3 text-primary">Som de notificação</h3>
      <div className="flex flex-col gap-2">
        <span className="text-small text-secondary">Arquivo atual</span>
        <p className="truncate text-body text-primary">
          {sound
            ? `${sound.fileName} (${formatFileSize(sound.size)})`
            : "Nenhum som. As notificações chegam em silêncio."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={Upload}
          loading={upload.isPending}
          onClick={() => fileInput.current?.click()}
        >
          {sound ? "Trocar som" : "Enviar som"}
        </Button>
        {sound ? (
          <>
            <Button
              variant="ghost"
              icon={Play}
              disabled={!soundQuery.data}
              onClick={() => soundQuery.data && playSound(soundQuery.data)}
            >
              Ouvir
            </Button>
            <Button variant="danger" icon={Trash2} loading={remove.isPending} onClick={onRemove}>
              Remover
            </Button>
          </>
        ) : null}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {error ? <p className="text-caption text-danger">{error}</p> : null}
      <p className="text-caption text-muted">
        Toca para todos quando chega uma notificação nova. MP3, OGG ou WAV, até 1 MB.
      </p>
    </section>
  );
}

import { getErrorMessage } from "@/lib/api";
import { authStore } from "@/lib/auth";
import type { DemoProfile } from "@/lib/demo";
import { useState } from "react";

export function DemoProfilePicker({
  profiles,
  onEntered,
}: {
  profiles: DemoProfile[];
  onEntered: () => void;
}) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function enter(key: string) {
    setError("");
    setPendingKey(key);
    try {
      await authStore.loginAsDemo(key);
      onEntered();
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao conectar com o servidor"));
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {profiles.map((profile) => (
        <button
          key={profile.key}
          type="button"
          onClick={() => enter(profile.key)}
          disabled={pendingKey !== null}
          className="flex w-full flex-col items-start gap-1 rounded-md border border-default bg-base px-4 py-3 text-left transition-colors hover:border-accent disabled:opacity-50"
        >
          <span className="text-body-medium text-primary">
            {pendingKey === profile.key ? "Entrando..." : `Entrar como ${profile.label}`}
          </span>
          <span className="text-caption text-secondary">{profile.description}</span>
        </button>
      ))}
      {error ? <p className="text-caption text-danger">{error}</p> : null}
      <p className="text-caption text-muted">
        Ambiente de demonstração com dados fictícios. Tudo volta ao estado inicial a cada novo
        acesso.
      </p>
    </div>
  );
}

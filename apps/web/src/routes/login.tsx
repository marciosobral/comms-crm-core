import { ApiError } from "@/lib/api";
import { authStore } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { applyCpfMask, normalizeEmail } from "@comms-crm-core/validation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: `Entrar · ${APP_NAME}` }],
  }),
  component: LoginPage,
});

type LoginMode = "reference" | "cpf" | "email";

const TABS: Array<{ id: LoginMode; label: string }> = [
  { id: "reference", label: "Referência" },
  { id: "cpf", label: "CPF" },
  { id: "email", label: "E-mail" },
];

const MODE_COPY: Record<LoginMode, { hint: string; label: string; placeholder: string }> = {
  reference: {
    hint: "Use sua referência e a senha cadastrada.",
    label: "Referência",
    placeholder: "0001",
  },
  cpf: {
    hint: "Use seu CPF e a senha cadastrada.",
    label: "CPF",
    placeholder: "000.000.000-00",
  },
  email: {
    hint: "Use seu e-mail e a senha cadastrada.",
    label: "E-mail",
    placeholder: "email@exemplo.com",
  },
};

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>("reference");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const copy = MODE_COPY[mode];

  function selectMode(next: LoginMode) {
    setMode(next);
    setIdentifier("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginIdentifier = mode === "email" ? normalizeEmail(identifier) : identifier.trim();
      await authStore.login(loginIdentifier, password);
      navigate({ to: "/" });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erro ao conectar com o servidor");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center w-full">
          <img src="/logo.png" alt={APP_NAME} className="h-20 object-contain" />
        </div>
        <div className="rounded-lg border border-default bg-surface p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div>
              <h1 className="text-h2 text-primary">Entrar</h1>
              <p className="mt-1 text-body text-secondary">{copy.hint}</p>
            </div>
          </div>

          <div className="mt-6 inline-flex w-full gap-1 rounded-[10px] border border-default bg-elevated p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectMode(item.id)}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center rounded-md px-3 text-small transition-colors",
                  mode === item.id
                    ? "bg-surface text-primary"
                    : "text-secondary hover:text-primary",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="identifier" className="text-small text-secondary">
                {copy.label}
              </label>
              <input
                id="identifier"
                type={mode === "email" ? "email" : "text"}
                inputMode={mode === "email" ? "email" : "numeric"}
                autoComplete={mode === "email" ? "username" : "off"}
                value={identifier}
                onChange={(e) =>
                  setIdentifier(mode === "cpf" ? applyCpfMask(e.target.value) : e.target.value)
                }
                placeholder={copy.placeholder}
                required
                className="h-10 w-full rounded-md border border-default bg-base px-3 text-body text-primary placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-small text-secondary">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-default bg-base px-3 text-body text-primary focus:border-accent focus:outline-none"
              />
            </div>

            {error ? <p className="text-caption text-danger">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-md bg-accent px-4 text-body-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

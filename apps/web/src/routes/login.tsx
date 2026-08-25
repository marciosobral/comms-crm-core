import { ApiError } from "@/lib/api";
import { authStore } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authStore.login(identifier, password);
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
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-on-accent text-body-medium">
            B
          </div>
          <span className="text-h3 text-primary">CRM</span>
        </div>

        <div className="rounded-lg border border-default bg-surface p-6">
          <h1 className="text-h2 text-primary">Entrar</h1>
          <p className="mt-1 text-body text-secondary">Acesse com seu CPF e senha</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="identifier" className="text-small text-secondary">
                CPF
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="000.000.000-00"
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

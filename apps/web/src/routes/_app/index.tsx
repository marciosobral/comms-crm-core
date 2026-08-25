import { useCurrentUser } from "@/hooks/use-current-user";
import { createFileRoute } from "@tanstack/react-router";
import { usePageMeta } from "../_app";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useCurrentUser();
  usePageMeta({ title: "Dashboard", breadcrumb: ["CRM", "Dashboard"] });

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-display text-primary">Olá, {firstName}! Bem-vindo ao CRM</h2>
      <p className="text-body text-secondary">
        Use o menu lateral para acessar vendas, planos e configurações.
      </p>
    </div>
  );
}

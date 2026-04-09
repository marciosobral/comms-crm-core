import { appConfig } from "@comms-core/config";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authStore } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (!authStore.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    if (!authStore.getAccessToken()) {
      const refreshed = await authStore.tryRefresh();
      if (!refreshed) {
        throw redirect({ to: "/login" });
      }
    }
  },
  component: Home,
});

function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold text-primary">{appConfig.name}</h1>
    </div>
  );
}

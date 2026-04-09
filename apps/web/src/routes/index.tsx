import { authStore } from "@/lib/auth";
import { appConfig } from "@comms-core/config";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      if (!authStore.isAuthenticated()) {
        navigate({ to: "/login" });
        return;
      }
      if (!authStore.getAccessToken()) {
        const refreshed = await authStore.tryRefresh();
        if (!refreshed) {
          navigate({ to: "/login" });
          return;
        }
      }
      setChecking(false);
    })();
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold text-primary">{appConfig.name}</h1>
    </div>
  );
}

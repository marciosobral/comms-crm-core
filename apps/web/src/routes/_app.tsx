import { PageHeader } from "@/components/shell/page-header";
import { type PageMeta, PageMetaContext } from "@/components/shell/page-meta";
import { Sidebar } from "@/components/shell/sidebar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authStore } from "@/lib/auth";
import { queryClient } from "@/lib/query";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [meta, setMeta] = useState<PageMeta>({ title: "", breadcrumb: [] });
  const { user } = useCurrentUser();

  // Runs after hydration on purpose: tokens live only in the browser, and a beforeLoad redirect
  // during hydration breaks it.
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

  const onLogout = async () => {
    await authStore.logout();
    queryClient.clear();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} user={user ?? null} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageHeader
          title={meta.title}
          breadcrumb={meta.breadcrumb}
          user={user ?? null}
          onLogout={onLogout}
        />
        <main className="min-h-0 flex-1 overflow-auto p-8">
          <PageMetaContext.Provider value={setMeta}>
            <Outlet />
          </PageMetaContext.Provider>
        </main>
      </div>
    </div>
  );
}

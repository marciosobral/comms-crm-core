import { PageHeader } from "@/components/shell/page-header";
import { Sidebar } from "@/components/shell/sidebar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authStore } from "@/lib/auth";
import { queryClient } from "@/lib/query";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface PageMeta {
  title: string;
  breadcrumb: string[];
  action?: ReactNode;
}

const PageMetaContext = createContext<(meta: PageMeta) => void>(() => {});

export function usePageMeta(meta: PageMeta) {
  const setMeta = useContext(PageMetaContext);
  const { title, action } = meta;
  const breadcrumb = meta.breadcrumb.join("|");
  useEffect(() => {
    setMeta({ title, breadcrumb: breadcrumb.split("|"), action });
  }, [setMeta, title, breadcrumb, action]);
}

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [meta, setMeta] = useState<PageMeta>({ title: "", breadcrumb: [] });
  const { user } = useCurrentUser();

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
    <div className="flex min-h-screen bg-base">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} user={user ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={meta.title}
          breadcrumb={meta.breadcrumb}
          action={meta.action}
          user={user ?? null}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-auto p-8">
          <PageMetaContext.Provider value={setMeta}>
            <Outlet />
          </PageMetaContext.Provider>
        </main>
      </div>
    </div>
  );
}

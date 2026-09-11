import type { AuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({
  collapsed,
  onToggle,
  user,
}: {
  collapsed: boolean;
  onToggle: () => void;
  user: AuthUser | null;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visible = NAV_ITEMS.filter(
    (item) =>
      item.permission === null ||
      hasPermission(
        user ? { isSuperAdmin: user.isSuperAdmin, permissions: user.permissions } : null,
        item.permission,
      ),
  );

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-default bg-surface transition-all",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex h-20 justify-center items-center gap-3 px-4">
        {collapsed ? (
          <img
            src="/logo-mark.jpg"
            alt=""
            className="h-8 w-8 shrink-0 rounded-md object-cover"
          />
        ) : (
          <img src="/logo.png" alt="CRM" className="h-16 object-contain object-left" />
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {visible.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex h-9 items-center gap-3 rounded-md pl-2.5 pr-3 text-body transition-colors",
                active
                  ? "border-accent bg-surface-hover text-primary"
                  : "border-transparent text-secondary hover:bg-surface-hover hover:text-primary",
              )}
            >
              <item.icon
                size={16}
                aria-hidden
                className={cn("shrink-0", active ? "text-accent" : undefined)}
              />
              {collapsed ? null : item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className="flex h-9 items-center gap-3 px-6 text-secondary hover:text-primary"
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {collapsed ? null : <span className="text-body">Recolher</span>}
      </button>
    </aside>
  );
}

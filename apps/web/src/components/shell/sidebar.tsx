import type { AuthUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";

export function SidebarNav({
  user,
  collapsed = false,
  labelClassName,
  onNavigate,
}: {
  user: AuthUser | null;
  collapsed?: boolean;
  labelClassName?: string;
  onNavigate?: () => void;
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
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {visible.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            onClick={onNavigate}
            className={cn(
              "flex h-11 items-center gap-3 rounded-md pl-2.5 pr-3 text-body transition-colors sm:h-9",
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
            <span className={labelClassName}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  user,
}: {
  collapsed: boolean;
  onToggle: () => void;
  user: AuthUser | null;
}) {
  // Tablet always shows the icon rail; the expanded sidebar only exists on desktop.
  return (
    <aside
      className={cn(
        "hidden h-dvh w-16 shrink-0 flex-col border-r border-default bg-surface transition-all sm:flex",
        collapsed ? "lg:w-16" : "lg:w-60",
      )}
    >
      <div className="flex h-20 items-center justify-center gap-3 px-4">
        <img
          src="/logo-mark.jpg"
          alt=""
          className={cn(
            "h-8 w-8 shrink-0 rounded-md object-cover",
            collapsed ? undefined : "lg:hidden",
          )}
        />
        {collapsed ? null : (
          <img
            src="/logo.png"
            alt={APP_NAME}
            className="hidden h-16 object-contain object-left lg:block"
          />
        )}
      </div>

      <SidebarNav
        user={user}
        collapsed={collapsed}
        labelClassName={collapsed ? "hidden" : "hidden lg:inline"}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className="hidden h-9 items-center gap-3 px-6 text-secondary hover:text-primary lg:flex"
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {collapsed ? null : <span className="text-body">Recolher</span>}
      </button>
    </aside>
  );
}

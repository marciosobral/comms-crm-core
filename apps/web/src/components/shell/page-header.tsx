import { NotificationsBell } from "@/components/shell/notifications-bell";
import { useDismiss } from "@/hooks/use-dismiss";
import type { AuthUser } from "@/lib/auth";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useRef, useState } from "react";

export function PageHeader({
  title,
  breadcrumb,
  user,
  onLogout,
  onOpenMenu,
  isMenuOpen,
}: {
  title: string;
  breadcrumb: string[];
  user: AuthUser | null;
  onLogout: () => void;
  onOpenMenu: () => void;
  isMenuOpen: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useDismiss(menuOpen, [menuRef], () => setMenuOpen(false));

  const initials = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-default px-4 sm:h-20 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-secondary hover:text-primary lg:hidden"
        >
          <Menu size={20} aria-hidden />
        </button>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="hidden text-caption text-muted sm:block">{breadcrumb.join(" / ")}</span>
          <h1 className="truncate text-h3 text-primary sm:text-h2">{title}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div id="page-action-slot" className="flex items-center gap-2" />

        <NotificationsBell />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={[user?.name, user?.roleName].filter(Boolean).join(", ") || "Conta"}
            className="flex items-center gap-3 sm:border-l sm:border-default sm:pl-4"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-caption text-accent">
              {initials}
            </span>
            <span className="hidden flex-col items-start sm:flex">
              <span className="text-body-medium text-primary">{user?.name ?? ""}</span>
              {user?.roleName && <span className="text-caption text-muted">{user?.roleName}</span>}
            </span>
            <ChevronDown size={16} className="hidden text-muted sm:block" aria-hidden />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-12 z-50 w-48 rounded-md border border-default bg-elevated p-2">
              <div className="mb-1 border-b border-subtle px-3 pb-2 sm:hidden">
                <p className="truncate text-body-medium text-primary">{user?.name ?? ""}</p>
                {user?.roleName ? (
                  <p className="truncate text-caption text-muted">{user.roleName}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body text-secondary hover:bg-surface-hover hover:text-primary"
              >
                <LogOut size={16} aria-hidden />
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

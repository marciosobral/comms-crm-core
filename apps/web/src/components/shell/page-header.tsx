import type { AuthUser } from "@/lib/auth";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

export function PageHeader({
  title,
  breadcrumb,
  action,
  unreadCount = 0,
  user,
  onLogout,
}: {
  title: string;
  breadcrumb: string[];
  action?: ReactNode;
  unreadCount?: number;
  user: AuthUser | null;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const initials = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="flex h-20 items-center justify-between border-b border-default px-8">
      <div className="flex flex-col gap-1">
        <span className="text-caption text-muted">{breadcrumb.join(" / ")}</span>
        <h1 className="text-h2 text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {action}

        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notificações: ${unreadCount} não lidas` : "Notificações"}
          className="relative flex h-10 w-10 items-center justify-center rounded-md border border-default bg-elevated text-secondary hover:text-primary"
        >
          <Bell size={16} />
          {unreadCount > 0 ? (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
          ) : null}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-3 border-l border-default pl-4"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-caption text-accent">
              {initials}
            </span>
            <span className="flex flex-col items-start">
              <span className="text-body-medium text-primary">{user?.name ?? ""}</span>
              <span className="text-caption text-muted">{user?.roleName ?? "Sem cargo"}</span>
            </span>
            <ChevronDown size={16} className="text-muted" aria-hidden />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-12 z-50 w-48 rounded-md border border-default bg-elevated p-2">
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

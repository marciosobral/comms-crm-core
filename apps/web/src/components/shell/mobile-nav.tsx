import type { AuthUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { SidebarNav } from "./sidebar";

export function MobileNav({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: AuthUser | null;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // The drawer stops existing at lg, so an open one must not come back when the screen shrinks again.
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    document.addEventListener("keydown", onKey);
    desktopQuery.addEventListener("change", onClose);
    panelRef.current?.querySelector("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      desktopQuery.removeEventListener("change", onClose);
    };
  }, [open, onClose]);

  return (
    <div className="lg:hidden">
      <div
        className={cn(
          "fixed inset-0 z-50 bg-overlay duration-200",
          open
            ? "opacity-100 transition-opacity"
            : "invisible opacity-0 transition-[opacity,visibility]",
        )}
        onClick={onClose}
        role="presentation"
      />
      <div
        ref={panelRef}
        // Visibility only transitions on close, so the drawer is focusable the moment it opens and stays visible while it slides out.
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col border-r border-default bg-surface duration-200",
          open
            ? "translate-x-0 transition-[translate]"
            : "invisible -translate-x-full transition-[translate,visibility]",
        )}
        id="mobile-nav"
        {...(open ? { role: "dialog", "aria-modal": true, "aria-label": "Menu" } : {})}
      >
        <div className="flex h-20 items-center justify-between gap-3 px-4">
          <img src="/logo.png" alt={APP_NAME} className="h-16 object-contain object-left" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted hover:text-primary"
          >
            <X size={16} />
          </button>
        </div>
        <SidebarNav user={user} onNavigate={onClose} />
      </div>
    </div>
  );
}

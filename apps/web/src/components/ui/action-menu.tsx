import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ActionMenu({
  label,
  open,
  onOpenChange,
  children,
  menuClassName,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  menuClassName?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const isInside = (event: Event) => {
      const path = event.composedPath();
      return (
        (triggerRef.current != null && path.includes(triggerRef.current)) ||
        (menuRef.current != null && path.includes(menuRef.current))
      );
    };
    const onPointerDown = (event: PointerEvent) => {
      if (isInside(event)) return;
      onOpenChange(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || !coords) return;
    const menu = menuRef.current;
    if (!menu) return;
    const stop = (event: Event) => event.stopPropagation();
    menu.addEventListener("pointerdown", stop);
    return () => menu.removeEventListener("pointerdown", stop);
  }, [open, coords]);

  return (
    <div
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
        className="rounded-md p-1.5 text-secondary hover:bg-surface-hover hover:text-primary"
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: coords.top, right: coords.right }}
              className={cn(
                "fixed z-50 rounded-md border border-default bg-elevated py-1 shadow-lg",
                menuClassName ?? "w-40",
              )}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function ActionMenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const pointerHandled = useRef(false);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "block w-full px-3 py-2 text-left text-small hover:bg-surface-hover disabled:opacity-50",
        danger ? "text-danger" : "text-secondary hover:text-primary",
      )}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        pointerHandled.current = true;
        onClick();
      }}
      onClick={() => {
        if (pointerHandled.current) {
          pointerHandled.current = false;
          return;
        }
        onClick();
      }}
    >
      {children}
    </button>
  );
}

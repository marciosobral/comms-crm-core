import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export interface PageMeta {
  title: string;
  breadcrumb: string[];
  action?: ReactNode;
}

export const PageMetaContext = createContext<(meta: PageMeta) => void>(() => {});

export function usePageMeta(meta: PageMeta) {
  const setMeta = useContext(PageMetaContext);
  const { title, action } = meta;
  const breadcrumb = meta.breadcrumb.join("|");
  useEffect(() => {
    setMeta({ title, breadcrumb: breadcrumb.split("|"), action });
  }, [setMeta, title, breadcrumb, action]);
}

export function PageAction({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  const slot = document.getElementById("page-action-slot");
  if (!slot) return null;
  return createPortal(children, slot);
}

import { useState } from "react";

/** Tracks which row's ActionMenu is open, so only one can be open at a time. */
export function useRowMenu() {
  const [openId, setOpenId] = useState<string | null>(null);
  return {
    isOpen: (id: string) => openId === id,
    onOpenChange: (id: string) => (open: boolean) => setOpenId(open ? id : null),
    close: () => setOpenId(null),
  };
}

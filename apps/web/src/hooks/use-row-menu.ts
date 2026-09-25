import { useState } from "react";

export function useRowMenu() {
  const [openId, setOpenId] = useState<string | null>(null);
  return {
    isOpen: (id: string) => openId === id,
    onOpenChange: (id: string) => (open: boolean) => setOpenId(open ? id : null),
    close: () => setOpenId(null),
  };
}

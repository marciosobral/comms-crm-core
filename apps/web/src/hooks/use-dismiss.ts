import { type RefObject, useEffect, useEffectEvent } from "react";

export function useDismiss(
  isOpen: boolean,
  insideRefs: RefObject<HTMLElement | null>[],
  onDismiss: () => void,
) {
  const dismissIfOutside = useEffectEvent((event: PointerEvent) => {
    const path = event.composedPath();
    const isInside = insideRefs.some((ref) => ref.current !== null && path.includes(ref.current));
    if (!isInside) onDismiss();
  });
  const dismissOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") onDismiss();
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome 1.9 does not know useEffectEvent, whose functions must not be dependencies.
  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("pointerdown", dismissIfOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissIfOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [isOpen]);
}

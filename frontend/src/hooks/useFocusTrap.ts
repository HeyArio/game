import { useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus within the returned ref container.
 * Saves the previously-focused element and restores it on unmount.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const prior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prior.current = document.activeElement as HTMLElement;
    const container = ref.current;
    if (!container) return;

    const focusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));

    focusable()[0]?.focus();

    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const nodes = focusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      prior.current?.focus();
    };
  }, []);

  return ref;
}

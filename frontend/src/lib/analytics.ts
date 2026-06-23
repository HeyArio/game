// Cookieless, privacy-friendly analytics via Plausible.
//
// Entirely inert unless VITE_PLAUSIBLE_DOMAIN is set, so the default build ships
// with no tracking and no third-party script. When configured it loads
// Plausible's lightweight script (no cookies → no consent banner needed, which
// keeps the privacy policy simple) and exposes a tiny track() for custom events:
// sign-in starts, votes locked, shares, founder joins.
//
// Swap providers by pointing VITE_PLAUSIBLE_SRC at a self-hosted instance, or
// replace the two functions below to wire a different tool (e.g. PostHog).

const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
const SRC =
  (import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined) ||
  "https://plausible.io/js/script.tagged-events.js";

type PlausibleFn = ((event: string, opts?: { props?: Record<string, string | number | boolean> }) => void) & {
  q?: unknown[];
};

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

/**
 * Inject the analytics script once, if a domain is configured. Call this at app
 * startup. No-ops when unconfigured or already loaded. Sets up a queue stub so
 * track() calls made before the script finishes loading aren't lost.
 */
export function initAnalytics(): void {
  if (!DOMAIN || typeof document === "undefined") return;
  if (document.querySelector("script[data-quorum-analytics]")) return;

  window.plausible =
    window.plausible ||
    (function () {
      (window.plausible!.q = window.plausible!.q || []).push(arguments);
    } as unknown as PlausibleFn);

  const s = document.createElement("script");
  s.defer = true;
  s.src = SRC;
  s.setAttribute("data-domain", DOMAIN);
  s.setAttribute("data-quorum-analytics", "");
  document.head.appendChild(s);
}

/** Record a custom event. Safe to call unconditionally — a no-op when analytics
 *  isn't configured. */
export function track(event: string, props?: Record<string, string | number | boolean>): void {
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    /* never let analytics break the app */
  }
}

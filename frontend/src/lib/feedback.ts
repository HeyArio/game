// Where the in-app "Feedback" links point.
//
// A soft launch is for learning, so give early players one obvious way to reach
// you. Set VITE_FEEDBACK_URL to a form (Tally / Google Form / Typeform) to open
// it in a new tab; otherwise we fall back to a mailto with a useful subject.
//
// NOTE: update the fallback address below (or set VITE_FEEDBACK_URL) before
// launch — hello@quorumdaily.com is a placeholder.

const CONFIGURED = (import.meta.env.VITE_FEEDBACK_URL as string | undefined)?.trim();
const FALLBACK = "mailto:hello@quorumdaily.com?subject=" + encodeURIComponent("Quorum feedback");

/** The href for a Feedback link. */
export function feedbackHref(): string {
  return CONFIGURED || FALLBACK;
}

/** True when feedback points at an external form (so links open in a new tab). */
export function feedbackIsExternal(): boolean {
  return Boolean(CONFIGURED);
}

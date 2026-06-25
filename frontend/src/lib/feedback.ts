// Where the in-app "Feedback" links point.
//
// A soft launch is for learning, so give early players one obvious way to reach
// you. Set VITE_FEEDBACK_URL to a form (Tally / Google Form / Typeform) to open
// it in a new tab; otherwise we fall back to a mailto with a useful subject.
//
// The mailto fallback below points to info@nazarbanai.com — the parent company,
// Nazarban. Set VITE_FEEDBACK_URL to a form to override it with a survey instead.

const CONFIGURED = (import.meta.env.VITE_FEEDBACK_URL as string | undefined)?.trim();
const FALLBACK = "mailto:info@nazarbanai.com?subject=" + encodeURIComponent("Quorum feedback");

/** The href for a Feedback link. */
export function feedbackHref(): string {
  return CONFIGURED || FALLBACK;
}

/** True when feedback points at an external form (so links open in a new tab). */
export function feedbackIsExternal(): boolean {
  return Boolean(CONFIGURED);
}

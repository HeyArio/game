import type { GameState } from "../state/types";

const CONFIDENCE_EMOJI: Record<string, string> = { low: "🛡️", med: "⚖️", high: "🔥" };

/** Build the Wordle-style shareable summary for a finished case.
 *  Pass `withUrl: false` when the link is supplied separately (e.g. the native
 *  share sheet's `url` field) so it can unfurl the rich card without a dupe. */
export function buildShareText(s: GameState, withUrl = true): string {
  const no = s.caseNo ? `#${s.caseNo}` : "";
  const verdict = s.win ? "✅ I matched the judge" : "❌ I missed the judge";
  const conf = CONFIDENCE_EMOJI[s.confidence] ?? "";
  const lines = [
    `Quorum ${no}`.trim(),
    `${verdict} ${conf}`.trim(),
  ];
  if (s.crowdGuess) lines.push(s.crowdCorrect ? "🎯 Called the crowd too" : "🤷 Missed the crowd");
  lines.push(`🔥 Streak ${s.streak} · +${s.earned} XP`);
  if (withUrl) lines.push("Play today's case → quorumdaily.com");
  return lines.join("\n");
}

export const SHARE_URL = "https://quorumdaily.com";

/** Pre-built deep links for one-tap sharing to specific apps. */
export function shareLinks(s: GameState): { whatsapp: string; telegram: string; email: string } {
  const text = encodeURIComponent(buildShareText(s));
  const url = encodeURIComponent(SHARE_URL);
  return {
    whatsapp: `https://wa.me/?text=${text}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    email: `mailto:?subject=${encodeURIComponent("My Quorum result")}&body=${text}`,
  };
}

/** Copy the share summary to the clipboard. Used by the Instagram flow (which
 *  has no web share URL) so the caption is ready to paste. */
export async function copyShareText(s: GameState): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildShareText(s));
    return true;
  } catch {
    return false;
  }
}

/**
 * Share via the native share sheet when available (mobile), otherwise copy to
 * clipboard. Returns "shared" | "copied" | "error" so the UI can confirm.
 */
export async function shareResult(s: GameState): Promise<"shared" | "copied" | "error"> {
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      // Passing `url` (not just appending it to text) lets the share sheet and
      // receiving app unfurl the rich Open Graph card from index.html's meta tags.
      await (navigator as any).share({ title: "Quorum", text: buildShareText(s, false), url: SHARE_URL });
      return "shared";
    }
    await navigator.clipboard.writeText(buildShareText(s));
    return "copied";
  } catch {
    // User dismissing the native share sheet also lands here — treat as no-op error.
    try { await navigator.clipboard.writeText(buildShareText(s)); return "copied"; } catch { return "error"; }
  }
}

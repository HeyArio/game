import { supabase, isSupabaseConfigured } from "./supabase";
import type { Confidence } from "../state/types";
import type { VoteResult } from "../hooks/useVote";

// Guest play — the verdict before the wall.
//
// A logged-out visitor can lock in and watch the full reveal (the payoff IS the
// pitch); the sign-in ask comes after, framed as "save this". Two pieces make
// that honest:
//
//   1. submitGuestVote() asks the submit-vote function for a graded verdict
//      with { guest: true } — the server records nothing.
//   2. The pick is stashed in localStorage AFTER a successful grade (a failed
//      attempt never saw a verdict, so a retry may change the pick). Once a
//      verdict was shown, first pick wins: a guest who "replays" by refreshing
//      can't overwrite their call with an informed one. After sign-in (which
//      drops all URL/JS state on the OAuth redirect), the stash is redeemed as
//      the real, scored vote — the result they were shown is the result that
//      counts.

const KEY = "quorum_guest_pick";

export interface GuestPick {
  caseId: string;
  optionId: string;
  confidence: Confidence;
  crowdGuessOptionId: string | null;
}

/** Stash the guest's pick. Call only after the grade succeeded (the verdict
 *  was actually shown) — see module note. */
export function rememberGuestPick(pick: GuestPick): void {
  try { localStorage.setItem(KEY, JSON.stringify(pick)); } catch { /* private mode */ }
}

export function readGuestPick(): GuestPick | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.caseId !== "string" || typeof p?.optionId !== "string") return null;
    return {
      caseId: p.caseId,
      optionId: p.optionId,
      confidence: (["low", "med", "high"].includes(p.confidence) ? p.confidence : "med") as Confidence,
      crowdGuessOptionId: typeof p.crowdGuessOptionId === "string" ? p.crowdGuessOptionId : null,
    };
  } catch {
    return null;
  }
}

export function clearGuestPick(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** The stashed pick for THIS case, or null. A stash for any other (past) case
 *  is stale and is cleared on sight — this owns the staleness rule so the
 *  guest-restore and post-sign-in-redeem paths can't drift apart. */
export function readGuestPickFor(caseId: string): GuestPick | null {
  const pick = readGuestPick();
  if (!pick) return null;
  if (pick.caseId !== caseId) { clearGuestPick(); return null; }
  return pick;
}

/** Grade a pick without recording anything (the server's guest preview path).
 *  Works logged-out: supabase-js sends the public anon key. */
export async function submitGuestVote(pick: GuestPick): Promise<VoteResult | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await supabase.functions.invoke("submit-vote", {
      body: {
        case_id: pick.caseId,
        option_id: pick.optionId,
        confidence: pick.confidence,
        crowd_guess_option_id: pick.crowdGuessOptionId,
        guest: true,
      },
    });
    if (res.error) return null;
    return res.data as VoteResult;
  } catch {
    return null;
  }
}

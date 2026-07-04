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
//   2. The pick is stashed in localStorage. First pick wins: a guest who saw
//      the verdict and "replays" by refreshing can't overwrite their call with
//      an informed one. After sign-in (which drops all URL/JS state on the
//      OAuth redirect), redeemGuestPick() converts the stash into the real,
//      scored vote — so the result they were shown is the result that counts.

const KEY = "quorum_guest_pick";

export interface GuestPick {
  caseId: string;
  optionId: string;
  confidence: Confidence;
  crowdGuessOptionId: string | null;
}

/** Stash the guest's pick unless one already exists for this case (first pick
 *  wins — see module note). Returns the pick that is now stashed. */
export function rememberGuestPick(pick: GuestPick): GuestPick {
  const existing = readGuestPick();
  if (existing && existing.caseId === pick.caseId) return existing;
  try { localStorage.setItem(KEY, JSON.stringify(pick)); } catch { /* private mode */ }
  return pick;
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

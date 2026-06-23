import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { track } from "./analytics";

// Personal invite links — the identity-level companion to challenge links.
//
// Every player has ONE stable, reusable link: quorumdaily.com/?i=<code>. A
// recipient who arrives via it and signs up becomes a "founding member" (a badge
// + a one-time welcome bonus) and is attributed to the inviter. Unlike a
// challenge (?c=<id>, tied to a specific case), this carries no case and never
// expires — it's "join Quorum via me," not "beat my score on case #42."
//
// There's no access gate: organic players still join freely; they're just not
// founders. The code is redeemed server-side by claim_invite (migration 0017),
// which owns every rule — set-once, no self-invite, new-signups-only.

const SITE = "https://quorumdaily.com";

// One caption, reused wherever the invite is shared.
const INVITE_TEXT =
  "I'm playing Quorum — the daily AI judgment game. Join as a founding member:";

const INV_KEY = "quorum_invite";

/** The shareable URL for a personal invite code. */
export function inviteUrl(code: string): string {
  return `${SITE}/?i=${encodeURIComponent(code)}`;
}

/** The caller's invite link state, from the get_my_invite RPC. */
export interface MyInvite {
  ok: boolean;
  code?: string;
  is_founder?: boolean;
  friends_joined?: number;
}

/** Read (and lazily mint) the signed-in player's personal invite link. */
export async function fetchMyInvite(): Promise<MyInvite | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.rpc("get_my_invite");
    if (error) return null;
    return (data as MyInvite) ?? null;
  } catch {
    return null;
  }
}

/** Remember an incoming invite code so it survives the sign-in round-trip. */
export function rememberInvite(code: string): void {
  try { localStorage.setItem(INV_KEY, code); } catch { /* private mode / no storage */ }
}

/** Outcome of redeeming a stashed invite code (the claim_invite RPC). */
export interface InviteClaim {
  ok: boolean;
  already?: boolean;
  founder?: boolean;
  reason?: string;
  bonus_xp?: number;
  total_xp?: number;
  level?: number;
  inviter_name?: string;
}

/**
 * Record that the signed-in user arrived via a personal invite link: mark them a
 * founding member, credit the inviter, and grant the welcome bonus. Safe to call
 * on every authenticated load — the server (claim_invite) enforces set-once,
 * no-self-invite and new-signups-only, so re-calls are harmless. We clear the
 * stashed code once the outcome is terminal (any structured response) so it never
 * re-fires; a transient network error keeps it for the next load.
 */
export async function claimInvite(): Promise<InviteClaim | null> {
  if (!isSupabaseConfigured) return null;
  let code = "";
  try { code = localStorage.getItem(INV_KEY) ?? ""; } catch { /* ignore */ }
  if (!code) return null;
  try {
    const { data, error } = await supabase.rpc("claim_invite", { p_code: code });
    if (error) return null; // transient — keep the code and retry next load
    try { localStorage.removeItem(INV_KEY); } catch { /* ignore */ }
    const result = (data as InviteClaim) ?? null;
    if (result?.ok && !result.already && result.founder) track("founder_joined");
    return result;
  } catch {
    return null; // keep the code for a future attempt
  }
}

/** Reads `?i=<code>` from the URL once and stashes it for post-sign-in claiming. */
export function useIncomingInvite(): string | null {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    let c = "";
    try { c = new URLSearchParams(window.location.search).get("i") ?? ""; } catch { /* ignore */ }
    if (!c) return;
    // Stash so the inviter gets credit even after sign-in: Google OAuth returns
    // to the bare origin and drops the query string, so the URL alone can't carry
    // the code across the round-trip. claimInvite() reads it back.
    rememberInvite(c);
    setCode(c);
  }, []);
  return code;
}

/**
 * Share a personal invite link. Native share sheet where available, else copy the
 * caption + link to the clipboard. Call from a click handler.
 */
export async function shareInvite(code: string): Promise<"shared" | "copied" | "cancelled" | "error"> {
  const link = inviteUrl(code);
  const text = INVITE_TEXT;
  track("invite_share");
  try {
    const nav = navigator as unknown as {
      share?: (d: unknown) => Promise<void>;
    };
    if (nav.share) {
      try { await nav.share({ title: "Quorum", text, url: link }); return "shared"; }
      catch (e: unknown) { if ((e as { name?: string })?.name === "AbortError") return "cancelled"; /* else fall through */ }
    }
    await navigator.clipboard.writeText(`${text} ${link}`);
    return "copied";
  } catch {
    return "error";
  }
}

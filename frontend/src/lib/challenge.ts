import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { roundRect, wrapText, drawMascot } from "./shareCard";
import type { GameState } from "../state/types";

// Challenge links — "nobody gets a link, everybody gets a challenge."
//
// A finished player mints a challenge: we render a 1200x630 preview card, upload
// it to public Storage, insert a (spoiler-free) `challenges` row, and hand back
// a shareable URL. The recipient lands on today's case with an intro and, after
// voting, a You-vs-them-vs-Arbi reveal.

export interface Challenge {
  id: string;
  case_no: number | null;
  question: string;
  challenger_name: string;
  challenger_pick: string | null; // a/b/c/d — an opinion, shown only AFTER the recipient votes
}

// Public, spoiler-free shape we read for the recipient intro.
const CHALLENGE_FIELDS = "id, case_no, question, challenger_name, challenger_pick";

const SITE = "https://quorumdaily.com";

/** A short, url-safe slug. ~62^12 space → collisions are negligible. */
function makeId(len = 12): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

/**
 * Where challenge links point.
 *
 * Default (nothing to configure): an empty base, so links become a clean,
 * on-brand `quorumdaily.com/?c=<id>` app link (see challengeUrl). We deliberately
 * do NOT default to the raw `…supabase.co/functions/v1/challenge/<id>` URL —
 * that reads like a phishing link and kills the share.
 *
 * Upgrade: set VITE_CHALLENGE_LINK_BASE to "https://quorumdaily.com/c" once nginx
 * proxies /c/ to the `challenge` function (see deploy/nginx-challenge.conf). That
 * keeps the link on your own domain AND restores the personalised crawler
 * preview (the "X challenges you" card).
 */
export function challengeLinkBase(): string {
  return (import.meta.env.VITE_CHALLENGE_LINK_BASE as string | undefined)?.replace(/\/+$/, "") ?? "";
}

export function challengeUrl(id: string): string {
  const base = challengeLinkBase();
  // No pretty base configured → a clean app link on our own domain. The
  // recipient's browser reads `?c=`; crawlers fall back to the site's generic
  // OG card. Configure the base + nginx proxy for a per-challenge preview.
  return base ? `${base}/${id}` : `${SITE}/?c=${id}`;
}

// Renders the challenge as a 1200x630 image (Open Graph aspect) for the link
// preview. Deliberately spoiler-free — it never shows the verdict.
async function renderChallengeCard(s: GameState, name: string): Promise<Blob | null> {
  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    const f = (document as any).fonts;
    if (f?.load) { await Promise.all([f.load("800 56px 'Baloo 2'"), f.load("800 30px Nunito")]); await f.ready; }
  } catch { /* fall back to system fonts */ }

  const green = "#58CC02", greenDark = "#46A302", ink = "#3C3C46", muted = "#7C8470";

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#EAF7DD"); bg.addColorStop(1, "#F4F8EE");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const pad = 44;
  roundRect(ctx, pad, pad, W - 2 * pad, H - 2 * pad, 40);
  ctx.fillStyle = "#fff"; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = "#E4EAD8"; ctx.stroke();

  const innerX = pad + 52;
  const innerW = W - 2 * (pad + 52);
  // Reserve a right-hand gutter for Arbi so the headline/question never run
  // under the mascot.
  const arbiSize = 172;
  const textW = innerW - arbiSize - 10;
  let y = pad + 70;

  // Wordmark: rounded "Q" badge + "Quorum"; case tag on the right.
  const badge = 66;
  roundRect(ctx, innerX, y - badge / 2, badge, badge, 22);
  ctx.fillStyle = green; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "800 40px 'Baloo 2', sans-serif";
  ctx.fillText("Q", innerX + badge / 2, y + 2);
  ctx.fillStyle = "#4A9600"; ctx.textAlign = "left"; ctx.font = "800 38px 'Baloo 2', sans-serif";
  ctx.fillText("Quorum", innerX + badge + 18, y + 2);
  ctx.fillStyle = muted; ctx.textAlign = "right"; ctx.font = "800 24px Nunito, sans-serif";
  ctx.fillText(s.caseNo ? `Daily Case #${s.caseNo}` : "Daily Case", innerX + innerW, y + 2);

  // Arbi, peeking from the right — the face you're being challenged to out-judge.
  drawMascot(ctx, innerX + innerW - arbiSize / 2, pad + 70 + 168, arbiSize, "neutral");

  y += 84;

  // "X challenges you"
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillStyle = greenDark; ctx.font = "800 52px 'Baloo 2', sans-serif";
  const headline = `${name} challenges you`;
  y = wrapText(ctx, headline, innerX, y, textW, 60, 2) + 14;

  // The question
  ctx.fillStyle = ink; ctx.font = "800 38px 'Baloo 2', sans-serif";
  y = wrapText(ctx, s.question, innerX, y, textW, 48, 3) + 22;

  // Spoiler-free prompt pill
  const pillH = 70;
  roundRect(ctx, innerX, y, innerW, pillH, 20);
  ctx.fillStyle = "#E8FFD7"; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = "#A5ED6E"; ctx.stroke();
  ctx.fillStyle = greenDark; ctx.font = "800 28px Nunito, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("They've made their call. Can you out-judge Arbi?", innerX + innerW / 2, y + pillH / 2 + 1);

  // Footer CTA pinned near the bottom
  ctx.fillStyle = green; ctx.font = "800 28px Nunito, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText("Play today's case → quorumdaily.com", W / 2, H - pad - 34);

  return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.92));
}

async function challengerName(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "A Quorum player";
    const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    const name = (data?.display_name ?? "").trim();
    return name && name.toLowerCase() !== "you" ? name : "A Quorum player";
  } catch {
    return "A Quorum player";
  }
}

/** Result of minting a challenge: the shareable URL plus the rendered card
 *  image, so the share sheet can attach the picture (not just the link). */
export interface MintedChallenge {
  url: string;
  cardBlob: Blob | null;
}

/**
 * Mint a challenge for the just-finished case and return its shareable URL plus
 * the rendered card image. Returns null when the backend isn't available (e.g.
 * the local dev LLM path), so callers can fall back to a plain invite link.
 */
export async function createChallenge(s: GameState): Promise<MintedChallenge | null> {
  if (!isSupabaseConfigured || !s.caseId) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const id = makeId();
    const name = await challengerName();

    // Render the preview card once: we both upload it (best-effort, for the
    // link's crawler preview) and hand it back so the share sheet can attach it
    // as an actual image.
    let cardBlob: Blob | null = null;
    let card_url: string | null = null;
    try {
      cardBlob = await renderChallengeCard(s, name);
      if (cardBlob) {
        const path = `${id}.png`;
        const { error: upErr } = await supabase.storage
          .from("challenge-cards")
          .upload(path, cardBlob, { contentType: "image/png", upsert: false });
        if (!upErr) {
          card_url = supabase.storage.from("challenge-cards").getPublicUrl(path).data.publicUrl;
        }
      }
    } catch { /* card is optional */ }

    const { error } = await supabase.from("challenges").insert({
      id,
      case_id: s.caseId,
      case_no: s.caseNo || null,
      question: s.question,
      category: s.category || null,
      challenger_name: name,
      challenger_pick: s.selected,           // letter only — spoiler-free
      confidence: s.confidence,
      card_url,
    });
    if (error) return null;

    return { url: challengeUrl(id), cardBlob };
  } catch {
    return null;
  }
}

export async function fetchChallenge(id: string): Promise<Challenge | null> {
  if (!isSupabaseConfigured || !id) return null;
  try {
    const { data } = await supabase.from("challenges").select(CHALLENGE_FIELDS).eq("id", id).maybeSingle();
    return (data as Challenge) ?? null;
  } catch {
    return null;
  }
}

/**
 * Share a challenge. Preferred path: send the rendered card IMAGE (Arbi + the
 * case, in our palette) with the link in the caption, so the recipient gets a
 * picture they can act on — not just a bare URL. Falls back to a text+url share,
 * then to copying the link, when image sharing isn't available.
 */
export async function shareChallengeLink(
  link: string,
  cardBlob?: Blob | null,
): Promise<"shared" | "copied" | "cancelled" | "error"> {
  const text = "I just played today's Quorum case — think you can out-judge Arbi?";
  try {
    const nav = navigator as any;

    // Best: image + link caption.
    if (cardBlob && nav.canShare && nav.share) {
      const file = new File([cardBlob], "quorum-challenge.png", { type: "image/png" });
      if (nav.canShare({ files: [file] })) {
        try { await nav.share({ files: [file], text: `${text} ${link}` }); return "shared"; }
        catch (e: any) { if (e?.name === "AbortError") return "cancelled"; /* else fall through */ }
      }
    }

    // Next best: text + url (no image attachment support).
    if (nav.share) {
      try { await nav.share({ title: "Quorum", text, url: link }); return "shared"; }
      catch (e: any) { if (e?.name === "AbortError") return "cancelled"; /* else fall through */ }
    }

    // Last resort: copy the link.
    await navigator.clipboard.writeText(link);
    return "copied";
  } catch {
    return "error";
  }
}

/** Reads `?c=<id>` from the URL once and resolves the incoming challenge. */
export function useIncomingChallenge(): Challenge | null {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  useEffect(() => {
    let id = "";
    try { id = new URLSearchParams(window.location.search).get("c") ?? ""; } catch { /* ignore */ }
    if (!id) return;
    let cancelled = false;
    fetchChallenge(id).then((c) => { if (!cancelled) setChallenge(c); });
    return () => { cancelled = true; };
  }, []);
  return challenge;
}

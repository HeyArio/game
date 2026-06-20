import type { GameState } from "../state/types";

// Renders the finished case as a 1080×1080 image for sharing (stories, IG,
// WhatsApp), so a result is a glanceable card rather than a block of text.

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Word-wrap fillText; returns the y just below the last line drawn.
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 4): number {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH; lines++; line = w;
      if (lines >= maxLines - 1) {
        // Last allowed line: truncate the remaining words with an ellipsis.
        let rest = words.slice(i).join(" ");
        while (rest.length && ctx.measureText(rest + "…").width > maxW) rest = rest.slice(0, -1);
        ctx.fillText(rest + "…", x, y);
        return y + lineH;
      }
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, y); y += lineH; }
  return y;
}

async function renderShareCard(s: GameState): Promise<Blob | null> {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Make sure the brand fonts are ready before we paint, else canvas falls back.
  try {
    const f = (document as any).fonts;
    if (f?.load) { await Promise.all([f.load("800 54px 'Baloo 2'"), f.load("800 38px Nunito")]); await f.ready; }
  } catch { /* fall back to system fonts */ }

  const win = s.win;
  const green = "#58CC02", greenDark = "#46A302", ink = "#3C3C46", muted = "#7C8470";

  // Background + card panel
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#EAF7DD"); bg.addColorStop(1, "#F4F8EE");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const pad = 60;
  const cardX = pad, cardY = pad, cardW = W - 2 * pad, cardH = H - 2 * pad;
  roundRect(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fillStyle = "#fff"; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = "#E4EAD8"; ctx.stroke();

  const innerX = cardX + 56;
  const innerW = cardW - 112;
  const cx = W / 2;
  let y = cardY + 96;

  // Wordmark: rounded "Q" badge + "Quorum"
  const badge = 80;
  roundRect(ctx, innerX, y - badge / 2, badge, badge, 26);
  ctx.fillStyle = green; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "800 50px 'Baloo 2', sans-serif";
  ctx.fillText("Q", innerX + badge / 2, y + 2);
  ctx.fillStyle = "#4A9600"; ctx.textAlign = "left"; ctx.font = "800 46px 'Baloo 2', sans-serif";
  ctx.fillText("Quorum", innerX + badge + 20, y + 2);
  ctx.fillStyle = muted; ctx.textAlign = "right"; ctx.font = "800 28px Nunito, sans-serif";
  ctx.fillText(s.caseNo ? `Daily Case #${s.caseNo}` : "Daily Case", innerX + innerW, y + 2);

  y += 96;

  // Question
  ctx.fillStyle = ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.font = "800 52px 'Baloo 2', sans-serif";
  y = wrapText(ctx, s.question, innerX, y, innerW, 64, 4) + 24;

  // Result banner
  const banH = 124;
  roundRect(ctx, innerX, y, innerW, banH, 28);
  ctx.fillStyle = win ? "#E8FFD7" : "#FFF3E0"; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = win ? "#A5ED6E" : "#FFCC80"; ctx.stroke();
  ctx.fillStyle = win ? greenDark : "#E07F00";
  ctx.font = "800 54px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(win ? "✓  We agree!" : "✕  Not this time", cx, y + banH / 2 + 2);
  y += banH + 44;

  // You vs Arbi
  const your = s.cards.find((c) => c.id === s.selected);
  const judge = s.cards.find((c) => c.id === s.judgeCardId);
  ctx.font = "700 34px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = muted;
  ctx.fillText(`${your ? "You backed " + your.letter : "—"}      ·      ${judge ? "Arbi backed " + judge.letter : "—"}`, cx, y);
  y += 70;

  // Streak + XP
  ctx.font = "800 40px Nunito, sans-serif"; ctx.fillStyle = ink;
  ctx.fillText(`🔥 ${s.streak} day streak       +${s.earned} XP`, cx, y);

  // Footer CTA pinned near the bottom
  ctx.fillStyle = green; ctx.font = "800 36px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText("Play today's case → quorumdaily.com", cx, cardY + cardH - 54);

  return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.92));
}

export type SharePlatform = "whatsapp" | "telegram" | "instagram" | "email";

// Where each platform button sends the user on desktop (where a generated image
// can't be attached to a deep link), so they can attach the just-saved PNG.
const PLATFORM_OPEN: Record<SharePlatform, string> = {
  whatsapp:  "https://web.whatsapp.com/",
  telegram:  "https://web.telegram.org/",
  instagram: "https://www.instagram.com/",
  email:     "mailto:?subject=" + encodeURIComponent("My Quorum result"),
};

/**
 * Share the result as an IMAGE ONLY — no caption text.
 *
 * Best path (mobile + modern desktop): the native share sheet with just the PNG
 * attached, so the user can send it to WhatsApp / Instagram / Telegram / Mail
 * and the image goes with it. The web platform can't attach a generated file to
 * an app-specific deep link, so on desktop without file-sharing we save the PNG
 * and (if a platform was requested) open that app so they can attach it.
 */
export async function shareResultImage(
  s: GameState,
  platform?: SharePlatform,
): Promise<"shared" | "downloaded" | "cancelled" | "error"> {
  try {
    const blob = await renderShareCard(s);
    if (!blob) return "error";
    const file = new File([blob], "quorum-result.png", { type: "image/png" });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
      try {
        // Image only — no `text` / `url`, so nothing but the card is shared.
        await nav.share({ files: [file], title: "Quorum" });
        return "shared";
      } catch (e: any) {
        if (e?.name === "AbortError") return "cancelled";
        // otherwise fall through to download
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "quorum-result.png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (platform) window.open(PLATFORM_OPEN[platform], "_blank", "noopener");
    return "downloaded";
  } catch {
    return "error";
  }
}

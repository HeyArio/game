import type { GameState } from "../state/types";

// Renders the finished case as a 1080×1080 image for sharing (stories, IG,
// WhatsApp), so a result is a glanceable card rather than a block of text.

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Word-wrap fillText; returns the y just below the last line drawn.
export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 4): number {
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

// Draws Arbi — the AI judge mascot — onto a canvas, centred at (cx, cy) and
// scaled to `size`. A 1:1 canvas port of components/Mascot.tsx (a 64-unit
// viewBox), so the shared image carries the same character players see in-app
// rather than just the word "Arbi".
export function drawMascot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  mood: "neutral" | "happy" | "soft" = "neutral",
) {
  const s = size / 64;
  const ox = cx - size / 2;
  const oy = cy - size / 2;
  const X = (u: number) => ox + u * s;
  const Y = (v: number) => oy + v * s;
  const S = (n: number) => n * s;
  const DK = "#2E6B00";
  const dot = (u: number, v: number, r: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(X(u), Y(v), S(r), 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const stroke = (w: number, color: string, draw: () => void) => {
    ctx.beginPath();
    ctx.lineWidth = S(w);
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    draw();
    ctx.stroke();
  };

  // Antenna
  stroke(3, "#46A302", () => { ctx.moveTo(X(32), Y(13)); ctx.lineTo(X(32), Y(6)); });
  dot(32, 4.5, 5, "rgba(123,224,33,0.4)");
  dot(32, 4.5, 3, "#58CC02");
  // Ears
  dot(10.5, 33, 3, "#46A302");
  dot(53.5, 33, 3, "#46A302");
  // Head, jaw, face screen
  roundRect(ctx, X(12), Y(12), S(40), S(40), S(15)); ctx.fillStyle = "#58CC02"; ctx.fill();
  roundRect(ctx, X(12), Y(38), S(40), S(14), S(7)); ctx.fillStyle = "#4FBE00"; ctx.fill();
  roundRect(ctx, X(17), Y(19), S(30), S(26), S(11)); ctx.fillStyle = "#ECFCDD"; ctx.fill();

  if (mood === "happy") {
    stroke(2.8, DK, () => { ctx.moveTo(X(21), Y(31)); ctx.quadraticCurveTo(X(25), Y(26), X(29), Y(31)); });
    stroke(2.8, DK, () => { ctx.moveTo(X(35), Y(31)); ctx.quadraticCurveTo(X(39), Y(26), X(43), Y(31)); });
    ctx.beginPath();
    ctx.moveTo(X(25), Y(36));
    ctx.quadraticCurveTo(X(32), Y(44), X(39), Y(36));
    ctx.closePath();
    ctx.fillStyle = DK; ctx.fill();
    dot(20.5, 35, 2, "rgba(255,143,163,0.85)");
    dot(43.5, 35, 2, "rgba(255,143,163,0.85)");
  } else if (mood === "soft") {
    dot(25, 31, 3.3, DK);
    dot(39, 31, 3.3, DK);
    stroke(2, DK, () => { ctx.moveTo(X(21), Y(25.5)); ctx.lineTo(X(28), Y(24.5)); });
    stroke(2, DK, () => { ctx.moveTo(X(36), Y(24.5)); ctx.lineTo(X(43), Y(25.5)); });
    stroke(2.6, DK, () => { ctx.moveTo(X(27), Y(38.5)); ctx.quadraticCurveTo(X(32), Y(40.5), X(37), Y(38.5)); });
  } else {
    dot(25, 30, 3.6, DK);
    dot(39, 30, 3.6, DK);
    dot(26.2, 28.8, 1.1, "#fff");
    dot(40.2, 28.8, 1.1, "#fff");
    stroke(2.6, DK, () => { ctx.moveTo(X(26), Y(37)); ctx.quadraticCurveTo(X(32), Y(41), X(38), Y(37)); });
  }
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

  // Result banner — Arbi (in the matching mood) sits on the left, so the card
  // is unmistakably "ours" the moment it lands in a chat.
  const banH = 150;
  roundRect(ctx, innerX, y, innerW, banH, 28);
  ctx.fillStyle = win ? "#E8FFD7" : "#FFF3E0"; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = win ? "#A5ED6E" : "#FFCC80"; ctx.stroke();
  // White disc + Arbi
  const discR = banH / 2 - 16;
  const discCx = innerX + 20 + discR;
  const discCy = y + banH / 2;
  ctx.beginPath(); ctx.arc(discCx, discCy, discR, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  drawMascot(ctx, discCx, discCy, discR * 1.7, win ? "happy" : "soft");
  // Verdict text to the right of Arbi
  ctx.fillStyle = win ? greenDark : "#E07F00";
  ctx.font = "800 52px 'Baloo 2', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(win ? "We agree!" : "Not this time", discCx + discR + 28, discCy + 2);
  y += banH + 40;

  // You vs Arbi
  const your = s.cards.find((c) => c.id === s.selected);
  const judge = s.cards.find((c) => c.id === s.judgeCardId);
  ctx.font = "700 34px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = muted;
  ctx.fillText(`${your ? "You backed " + your.letter : "—"}      ·      ${judge ? "Arbi backed " + judge.letter : "—"}`, cx, y);
  y += 70;

  // Streak + XP
  ctx.font = "800 40px Nunito, sans-serif"; ctx.fillStyle = ink;
  ctx.fillText(`🔥 ${s.streak} day streak       +${s.earned} XP`, cx, y);

  // Footer CTA pinned near the bottom, with a soft Nazarban brand line beneath
  // it (secondary to the Quorum CTA — awareness, not a second ask).
  ctx.fillStyle = green; ctx.font = "800 36px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText("Play today's case → quorumdaily.com", cx, cardY + cardH - 66);
  ctx.fillStyle = muted; ctx.font = "800 24px Nunito, sans-serif";
  ctx.fillText("Built by Nazarban · nazarbanai.com", cx, cardY + cardH - 30);

  return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.92));
}

// Wordle-style copyable result: spoiler-safe (never reveals which option won),
// pasteable anywhere plain text goes — group chats, forums, socials. This is
// the highest-reach share format a daily game has; the image card stays as the
// richer alternative.
export function buildResultShareText(s: GameState): string {
  const tier = { low: "🛡️ Safe", med: "⚖️ Balanced", high: "🎯 Bold" }[s.confidence] ?? "⚖️ Balanced";
  const bits = [`${tier} ${s.win ? "✅" : "❌"}`];
  if (s.crowdGuess) bits.push(`crowd ${s.crowdCorrect ? "✅" : "❌"}`);
  if (s.streak > 0) bits.push(`🔥 ${s.streak}`);
  return [
    `Quorum Daily Case${s.caseNo ? ` #${s.caseNo}` : ""}`,
    bits.join(" · "),
    "https://quorumdaily.com",
  ].join("\n");
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

// A short caption + link home, so a shared result still points people back to
// the game. Some apps (notably Instagram) keep only the image on a file share —
// the card itself also prints quorumdaily.com, so the link is never wholly lost.
const RESULT_SHARE_TEXT =
  "My Quorum result today — four AIs argue, one judge decides. Play free: https://quorumdaily.com";

/**
 * Share the result card image, with a short caption + link back to the game.
 *
 * Best path (mobile + modern desktop): the native share sheet with the PNG
 * attached and the caption text, so the user can send it to WhatsApp / Telegram /
 * Mail with both the image and the link. (Some targets, e.g. Instagram, keep only
 * the image — the card prints quorumdaily.com too, so the link survives.) The web
 * platform can't attach a generated file to an app-specific deep link, so on
 * desktop without file-sharing we save the PNG and (if a platform was requested)
 * open that app so they can attach it.
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
        // Image + caption: the PNG plus a one-line invite and link home.
        await nav.share({ files: [file], title: "Quorum", text: RESULT_SHARE_TEXT });
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

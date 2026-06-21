/**
 * challenge
 *
 * Serves the rich link preview for a challenge ("X challenged you on Quorum")
 * and bounces real visitors into the app.
 *
 * WHY THIS EXISTS: quorumdaily.com is a static SPA served by nginx — social
 * crawlers (WhatsApp, iMessage, Slack, X, Facebook, LinkedIn) read the HTML
 * WITHOUT running the app's JavaScript, so they only ever see the static
 * Open Graph tags in index.html. To give every challenge its own personalised
 * preview we need a server to render per-challenge <meta> tags. This function
 * is that server:
 *
 *   - A crawler fetching the link reads the dynamic og:title / og:description /
 *     og:image below and renders a personalised card.
 *   - A human's browser runs the redirect and lands on the SPA at
 *     `${SITE}/?c=<id>`, where the app shows the "X challenged you" intro.
 *
 * Deploy it PUBLIC (no JWT) so crawlers can reach it:
 *     supabase functions deploy challenge --no-verify-jwt
 *
 * The link can point straight here (zero web-server config), or nginx can proxy
 * a pretty `quorumdaily.com/c/<id>` path to it — see supabase/README.md.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = Deno.env.get("QUORUM_SITE_URL") ?? "https://quorumdaily.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);

  // The slug can arrive as ?id=<id> or as the trailing path segment
  // (.../challenge/<id>, or a proxied /c/<id>).
  let id = url.searchParams.get("id") ?? "";
  if (!id) {
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    id = last === "challenge" || last === "c" ? "" : last;
  }

  const fallbackImg = `${SITE}/og-image.png`;
  let title = "You've been challenged on Quorum";
  let desc = "Four AIs argue, one judge decides. Call today's verdict before the crowd and keep your streak alive.";
  let image = fallbackImg;
  const dest = id ? `${SITE}/?c=${encodeURIComponent(id)}` : SITE;

  if (id) {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data } = await admin
        .from("challenges")
        .select("challenger_name, question, case_no, card_url")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const name = (data.challenger_name || "A Quorum player").trim();
        const caseTag = data.case_no ? ` (Case #${data.case_no})` : "";
        title = `${name} challenged you on Quorum`;
        desc = data.question
          ? `"${data.question}" — back your answer and see if you can out-judge Arbi${caseTag}.`
          : desc;
        image = data.card_url || fallbackImg;
      }
    } catch {
      // fall back to the generic preview below
    }
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(dest)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Quorum">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(dest)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(dest)}">
</head>
<body style="margin:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#F4F8EE;color:#3C3C46;text-align:center;padding:56px 20px">
<script>location.replace(${JSON.stringify(dest)});</script>
<p style="font-weight:800;font-size:18px;margin:0 0 8px">Opening Quorum…</p>
<p style="margin:0"><a href="${esc(dest)}" style="color:#46A302;font-weight:800;text-decoration:none">Tap here if you're not redirected &rarr;</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Short cache: crawlers can cache the preview, but a re-share refreshes.
      "Cache-Control": "public, max-age=300",
      ...CORS,
    },
  });
});

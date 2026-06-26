/**
 * email-unsubscribe
 *
 * The one-click opt-out target for the footer link in every daily reminder.
 * A player clicks it from their email client — there is no auth header — so this
 * function is deployed PUBLIC (no JWT) and authenticates purely on the
 * unguessable per-row token minted in migration 0018.
 *
 *   GET /email-unsubscribe?token=<uuid>
 *     → flips email_preferences.daily_reminder = false for that row and returns
 *       a friendly confirmation page. Idempotent: clicking twice is harmless.
 *
 * Deploy PUBLIC so the email click reaches it:
 *     supabase functions deploy email-unsubscribe --no-verify-jwt
 *
 * The token is a v4 UUID (122 bits) — unguessable — so a public endpoint can't
 * be used to enumerate or unsubscribe arbitrary players.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = Deno.env.get("QUORUM_SITE_URL") ?? "https://quorumdaily.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#F4F8EE;color:#3C3C46;text-align:center;padding:64px 20px">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:36px 28px">
    <p style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#46A302;margin:0 0 8px">Quorum</p>
    <h1 style="font-size:22px;font-weight:800;color:#1A1A22;margin:0 0 12px">${title}</h1>
    <p style="font-size:15px;line-height:1.5;margin:0 0 24px">${body}</p>
    <a href="${SITE}" style="display:inline-block;background:#58CC02;color:#fff;font-weight:800;text-decoration:none;padding:12px 28px;border-radius:12px">Back to Quorum →</a>
  </div>
</body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!token) {
    return page("Invalid link", "This unsubscribe link is missing its token. Use the link from a recent email.", 400);
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin
      .from("email_preferences")
      .update({ daily_reminder: false })
      .eq("unsubscribe_token", token)
      .select("user_id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      // Unknown/expired token — don't confirm or deny a specific account.
      return page("Link not recognised", "We couldn't match this link. You may already be unsubscribed.", 404);
    }

    return page(
      "You're unsubscribed",
      "You won't get daily reminder emails any more. You can still play any time — your streak and progress are untouched.",
    );
  } catch (e) {
    console.error(e);
    return page("Something went wrong", "We couldn't update your preference just now. Please try the link again in a moment.", 500);
  }
});

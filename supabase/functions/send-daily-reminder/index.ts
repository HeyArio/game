/**
 * send-daily-reminder
 *
 * Emails every signed-up player a once-a-day nudge that today's Quorum case is
 * live ("the question is live — keep your streak alive"). Mirrors the
 * generate-daily-case job: privileged, fired by Supabase cron, never reachable
 * by an ordinary visitor.
 *
 * Pipeline:
 *   1. Authorize (service-role key OR shared x-cron-secret) — same gate as
 *      generate-daily-case, because this spends an email quota and hits users.
 *   2. Read today's open case (the `today_case` view) for the question text.
 *   3. Page through `auth.users` (admin API) for addresses — we never store
 *      emails ourselves (cf. migration 0001).
 *   4. Drop anyone who unsubscribed (`email_preferences.daily_reminder=false`)
 *      and anyone without a usable address.
 *   5. Send via Zoho ZeptoMail, one personalised message per recipient (each
 *      carries that player's own one-click unsubscribe link), with a small
 *      concurrency cap so we don't burst the API.
 *
 * Secrets (Supabase dashboard → Edge Functions → Secrets, or supabase/.env):
 *
 *   ZEPTOMAIL_TOKEN      ZeptoMail "Send Mail Token" (sent as
 *                        `Authorization: Zoho-enczapikey <token>`).
 *   EMAIL_FROM_ADDRESS   A verified ZeptoMail sender, e.g. noreply@quorumdaily.com
 *   EMAIL_FROM_NAME      Display name for the From header (default "Quorum").
 *   ZEPTOMAIL_API_URL    (optional) override the send endpoint — default is the
 *                        US host. Use https://api.zeptomail.eu/v1.1/email for EU
 *                        data-centre accounts.
 *   QUORUM_SITE_URL      (optional) play link target (default quorumdaily.com).
 *   CRON_SECRET          (optional) shared secret accepted via x-cron-secret.
 *
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-provided by Supabase.
 *
 * Deploy (keeps verify_jwt ON — only the cron/operator may call it):
 *     supabase functions deploy send-daily-reminder
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = Deno.env.get("QUORUM_SITE_URL") ?? "https://quorumdaily.com";
const ZEPTO_URL = Deno.env.get("ZEPTOMAIL_API_URL") ?? "https://api.zeptomail.com/v1.1/email";
const FROM_ADDRESS = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "";
const FROM_NAME = Deno.env.get("EMAIL_FROM_NAME") ?? "Quorum";

// How many ZeptoMail requests to keep in flight at once. ZeptoMail sends one
// message per call here (each needs its own unsubscribe link), so we cap the
// fan-out to stay polite and within an edge function's wall-clock budget.
const SEND_CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 20_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/** Decode a JWT payload (no signature check — the Supabase gateway already
 *  verifies the signature when verify_jwt is on). Returns {} on any failure. */
function jwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1] ?? "";
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

/** Only the daily cron (or an operator) may fan out a send. The public anon key
 *  is a valid project JWT, so `verify_jwt` alone is NOT enough — require the
 *  service role, or a shared CRON_SECRET header. (Same gate as generate-daily-case.) */
function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) return true;

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return false;
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
  return jwtPayload(token).role === "service_role";
}

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

interface Recipient {
  email: string;
  name: string;
  token: string;
}

/** The branded reminder. Plain, fast, on-brand — a nudge, not a newsletter.
 *  Every message carries the recipient's own one-click unsubscribe link. */
function renderEmail(r: Recipient, question: string, caseNo: number | null) {
  const playUrl = `${SITE}/`;
  const unsubUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/email-unsubscribe?token=${encodeURIComponent(r.token)}`;
  const caseTag = caseNo ? `Case #${caseNo}` : "Today's case";
  const greetName = r.name && r.name !== "You" ? `, ${r.name}` : "";

  const subject = question
    ? `🟢 Today's question is live: ${question}`
    : "🟢 Today's Quorum question is live";

  const questionBlock = question
    ? `<p style="font-size:20px;line-height:1.4;font-weight:800;color:#1A1A22;margin:0 0 24px">"${esc(question)}"</p>`
    : "";

  const htmlbody = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F4F8EE;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3C3C46">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F8EE"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden">
      <tr><td style="padding:32px 32px 8px">
        <p style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#46A302;margin:0 0 4px">Quorum · ${esc(caseTag)}</p>
        <h1 style="font-size:24px;line-height:1.25;font-weight:800;color:#1A1A22;margin:0 0 16px">Today's question is live${esc(greetName)} 👋</h1>
        ${questionBlock}
        <p style="font-size:16px;line-height:1.5;margin:0 0 28px">Four frontier AIs have answered. Call the sharpest pick before the crowd, see if you can out-judge Arbi — and keep your streak alive.</p>
        <a href="${esc(playUrl)}" style="display:inline-block;background:#58CC02;color:#FFFFFF;font-size:17px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:12px">Play today's case →</a>
      </td></tr>
      <tr><td style="padding:28px 32px 32px">
        <hr style="border:none;border-top:1px solid #ECECEC;margin:0 0 16px">
        <p style="font-size:12px;line-height:1.5;color:#9A9AA6;margin:0">
          You're getting this because you signed up for Quorum at ${esc(SITE)}.<br>
          <a href="${esc(unsubUrl)}" style="color:#9A9AA6;text-decoration:underline">Unsubscribe from daily reminders</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const textbody = `Today's Quorum question is live${greetName ? ` ${r.name}` : ""}.
${question ? `\n"${question}"\n` : ""}
Four frontier AIs have answered. Call the sharpest pick before the crowd and keep your streak alive.

Play today's case: ${playUrl}

— Quorum
Unsubscribe from daily reminders: ${unsubUrl}`;

  return { subject, htmlbody, textbody };
}

async function sendOne(r: Recipient, question: string, caseNo: number | null, token: string): Promise<boolean> {
  const { subject, htmlbody, textbody } = renderEmail(r, question, caseNo);
  try {
    const res = await fetch(ZEPTO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Zoho-enczapikey ${token}`,
      },
      body: JSON.stringify({
        from: { address: FROM_ADDRESS, name: FROM_NAME },
        to: [{ email_address: { address: r.email, name: r.name || undefined } }],
        subject,
        htmlbody,
        textbody,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`ZeptoMail send failed for ${r.email}: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`ZeptoMail send threw for ${r.email}:`, e);
    return false;
  }
}

/** Run `worker` over `items` with at most `limit` in flight. */
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<boolean>): Promise<number> {
  let ok = 0;
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      if (await worker(item)) ok++;
    }
  });
  await Promise.all(runners);
  return ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);

  const zeptoToken = Deno.env.get("ZEPTOMAIL_TOKEN") ?? "";
  if (!zeptoToken || !FROM_ADDRESS) {
    return json({ error: "Email not configured: set ZEPTOMAIL_TOKEN and EMAIL_FROM_ADDRESS." }, 500);
  }

  // Optional { "testEmail": "you@example.com" } — send ONLY to that address (if it
  // belongs to a signed-up user) for an isolated deliverability test, instead of
  // the whole list. Auth is already enforced above, so only an operator can do this.
  let testEmail = "";
  if (req.method === "POST") {
    try { testEmail = String((await req.json())?.testEmail ?? "").trim().toLowerCase(); }
    catch { testEmail = ""; }
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1. Today's open case (for the subject/body). Optional — the reminder still
    //    makes sense if the case row isn't readable for some reason.
    let question = "";
    let caseNo: number | null = null;
    const { data: caseRow } = await admin
      .from("today_case")
      .select("case_no, question")
      .maybeSingle();
    if (caseRow) {
      question = caseRow.question ?? "";
      caseNo = caseRow.case_no ?? null;
    }

    // 2. Unsubscribe state + tokens, keyed by user id.
    const { data: prefRows, error: prefErr } = await admin
      .from("email_preferences")
      .select("user_id, daily_reminder, unsubscribe_token");
    if (prefErr) throw prefErr;
    const prefs = new Map(
      (prefRows ?? []).map((p) => [p.user_id as string, p as { daily_reminder: boolean; unsubscribe_token: string }]),
    );

    // 3. Page through auth.users for addresses (we never store emails ourselves).
    const allUsers: { id: string; email: string; name: string }[] = [];
    let page = 1;
    const perPage = 1000;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users ?? [];
      for (const u of users) {
        if (!u.email) continue;
        const name =
          (u.user_metadata?.full_name as string | undefined) ??
          (u.user_metadata?.name as string | undefined) ??
          "";
        allUsers.push({ id: u.id, email: u.email, name });
      }
      if (users.length < perPage) break;
      page++;
    }

    // 3b. Self-heal: make sure every signed-up user has a preferences row (opt-in
    //     flag + unsubscribe token). The signup trigger normally seeds this, but
    //     if the trigger is missing or a user was created another way we'd
    //     otherwise silently never email them. Insert any missing rows, then pull
    //     back their fresh tokens so they're eligible this run.
    const missing = allUsers.filter((u) => !prefs.has(u.id)).map((u) => u.id);
    if (missing.length) {
      const { error: healErr } = await admin
        .from("email_preferences")
        .upsert(missing.map((id) => ({ user_id: id })), { onConflict: "user_id", ignoreDuplicates: true });
      if (healErr) console.error("Failed to backfill email_preferences:", healErr);
      const { data: healed } = await admin
        .from("email_preferences")
        .select("user_id, daily_reminder, unsubscribe_token")
        .in("user_id", missing);
      for (const row of healed ?? []) {
        prefs.set(row.user_id as string, row as { daily_reminder: boolean; unsubscribe_token: string });
      }
    }

    // 3c. Build the recipient list, dropping anyone who unsubscribed.
    let recipients: Recipient[] = [];
    let skippedUnsub = 0;
    for (const u of allUsers) {
      const pref = prefs.get(u.id);
      if (pref && pref.daily_reminder === false) { skippedUnsub++; continue; }
      if (!pref?.unsubscribe_token) continue;
      recipients.push({ email: u.email, name: u.name, token: pref.unsubscribe_token });
    }

    // Test mode: narrow to just the requested address (must be a signed-up user
    // so we have a real unsubscribe token for it).
    if (testEmail) {
      recipients = recipients.filter((r) => r.email.toLowerCase() === testEmail);
      if (recipients.length === 0) {
        return json({
          ok: false,
          error: `No signed-up, subscribed user matches ${testEmail}. Sign up with that address first (or check it isn't unsubscribed), then retry.`,
        }, 404);
      }
    }

    if (recipients.length === 0) {
      return json({ ok: true, sent: 0, recipients: 0, skippedUnsubscribed: skippedUnsub, note: "No eligible recipients." });
    }

    // 4. Send, capped concurrency.
    const sent = await pool(recipients, SEND_CONCURRENCY, (r) => sendOne(r, question, caseNo, zeptoToken));

    // 5. Stamp last-sent for the recipients we attempted (best-effort). Skipped in
    //    test mode so a one-off test doesn't move everyone's last-sent timestamp.
    if (!testEmail) {
      const attemptedIds = (prefRows ?? [])
        .filter((p) => p.daily_reminder !== false && p.unsubscribe_token)
        .map((p) => p.user_id as string);
      if (attemptedIds.length) {
        const { error: stampErr } = await admin
          .from("email_preferences")
          .update({ last_reminder_at: new Date().toISOString() })
          .in("user_id", attemptedIds);
        if (stampErr) console.error("Failed to stamp last_reminder_at:", stampErr);
      }
    }

    return json({
      ok: true,
      caseNo,
      test: testEmail || undefined,
      recipients: recipients.length,
      sent,
      failed: recipients.length - sent,
      skippedUnsubscribed: skippedUnsub,
    });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

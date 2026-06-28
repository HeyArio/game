# Quorum — backend (Supabase)

This directory holds the database schema for Quorum. We use **Supabase Cloud**
for Postgres + Auth (Google OAuth), and host the static frontend separately on
the VPS. Nothing here runs on the VPS.

## 1. Create the Supabase project

1. Go to <https://supabase.com> → **New project** (free tier is fine).
2. Pick a region close to your users and set a strong database password.
3. Once provisioned, open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`
   Put both in `frontend/.env` (copy from `frontend/.env.example`).

## 2. Apply the schema

Open **SQL Editor** in the Supabase dashboard and run each migration in
`migrations/` in order (`0001` → `0011`). (Or, with the Supabase CLI linked to
the project: `supabase db push`.)

This creates: `profiles`, `user_progress`, `daily_cases`, `case_options`,
`votes`, `leagues`, `league_memberships`, `quests`, `quest_progress`,
`achievements`, `user_achievements`; the `today_case`, `case_vote_summary`,
`league_standings`, and `global_leaderboard` views; the
`update_user_progress_after_vote` scoring RPC; a signup trigger that seeds a
profile + progress row; and Row Level Security policies on every table.

The frontend reads **real data** for the daily case, voting/scoring, XP, streak,
level (derived from XP), the leaderboard (`global_leaderboard`, ranked by total
XP, including labeled AI opponents), and the profile/achievement figures
(`get_player_stats`, computed from real vote history). **Quest rewards are real**
(migration `0011`): `get_quest_state` returns each quest's live progress, and
`claim_quest` grants the bonus XP into `total_xp` exactly once per period
(idempotent, server-validated). The **league tier** (Bronze → Diamond) is derived
from real `total_xp`, so the Profile badge, the Leagues ladder, and the top-bar
chip all reflect actual standing. The only remaining presentational piece is the
schema's optional tiered weekly **league** cohorts/resets (the all-time
`global_leaderboard` stands in for now).

## 3. Enable Google login

**a. Google Cloud Console** (<https://console.cloud.google.com>):
1. Create / select a project → **APIs & Services → Credentials**.
2. Configure the **OAuth consent screen** (External, add your email as a test
   user while in testing).
3. **Create Credentials → OAuth client ID → Web application**.
4. Under **Authorized redirect URIs** add the callback Supabase shows you in the
   next step — it looks like:
   `https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback`
5. Copy the generated **Client ID** and **Client secret**.

**b. Supabase dashboard → Authentication → Providers → Google**:
1. Toggle it on, paste the **Client ID** and **Client secret**, save.

**c. Supabase dashboard → Authentication → URL Configuration**:
1. Set **Site URL** to your domain (e.g. `https://yourdomain.com`).
2. Add the same URL (and `http://localhost:5173` for local dev) to
   **Redirect URLs**, so the OAuth handshake is allowed to return there.

That's it — the frontend's "Continue with Google" button
(`supabase.auth.signInWithOAuth({ provider: 'google' })`) now works end to end.

## 4. LLM providers + daily case generation

The `generate-daily-case` Edge Function calls four LLM providers across the
five persona slots (Gemini doubles as a contestant and the judge):

| Slot | Card name | Provider | Default model |
|------|-----------|----------|---------------|
| 1 | GPT-OSS 20B | OpenRouter | `openai/gpt-oss-20b:free` |
| 2 | Llama 3.3 70B | Groq | `llama-3.3-70b-versatile` |
| 3 | Mistral Small | Mistral | `mistral-small-latest` |
| 4 | Gemini Flash | Gemini | `gemini-3.1-flash-lite-preview` |
| 5 | Arbi (judge) | Gemini | `gemini-3.1-flash-lite-preview` |

Gemini is the judge: it evaluates the four contestant answers and picks the
sharpest, emitting clean JSON verdicts. The function speaks each provider's
native wire format — OpenAI-style chat completions (OpenRouter / Groq /
Mistral) and Gemini's `generateContent`.

These provider/model pairs are baked in as defaults — you do **not** need to
set them. Override any slot with `LLM_PROVIDER_1`..`5` and `LLM_MODEL_1`..`5`
if you want to swap a provider or model without redeploying.

**Set the API keys.** Keep your keys in a local `.env` file and push them up —
no dashboard clicking needed:

```bash
cp supabase/.env.example supabase/.env   # then edit supabase/.env, add your keys
supabase secrets set --env-file ./supabase/.env
```

`supabase/.env` is git-ignored, so your keys never get committed. Each provider
has its own key: `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`,
`GEMINI_API_KEY`.

> ⚠️ Do **not** put these keys in `frontend/.env`. That file is compiled into
> the browser bundle and is publicly visible — it would leak your API keys.
> These keys are server-side only and belong in `supabase/.env`.

(You can also set them via the dashboard → **Settings → Edge Functions →
Secrets** if you prefer — same result.)

**Deploy the functions** (Supabase CLI, linked to your project):
```bash
supabase functions deploy generate-daily-case
supabase functions deploy submit-vote
```

**Authorization.** This function is privileged — it spends LLM credits and
replaces today's case — so it rejects ordinary callers. The public anon key is a
valid project JWT, so `verify_jwt` alone wouldn't stop a random visitor; the
function additionally requires **either** the service-role key **or** a shared
`x-cron-secret`. The scheduled cron below already sends the service-role key, so
it works unchanged. (Optional: `supabase secrets set CRON_SECRET=<random>` and
send it as the `x-cron-secret` header instead of the service-role key.) Do **not**
deploy this function with `--no-verify-jwt`.

**Generate the first case manually** (send the service-role key — a plain
`supabase functions invoke` uses the anon key and is now correctly rejected):
```bash
curl -X POST 'https://YOUR-PROJECT-ref.supabase.co/functions/v1/generate-daily-case' \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json"
```

**Schedule it daily** (Supabase SQL editor — needs pg_cron + pg_net enabled,
both available on the free tier under Database → Extensions):
```sql
select cron.schedule(
  'generate-daily-case', '5 0 * * *',
  $$ select net.http_post(
       url     := 'https://YOUR-PROJECT-ref.supabase.co/functions/v1/generate-daily-case',
       headers := '{"Authorization": "Bearer YOUR-SERVICE-ROLE-KEY", "Content-Type": "application/json"}'::jsonb
     ); $$
);
```

To force a specific question instead of an AI-generated one, POST a body:
`{ "question": "...", "category": "TECHNOLOGY · PREDICTION" }`.

## 5. Labeled AI opponents (leaderboard bots)

Migration `0006` seeds a roster of clearly-labeled AI opponents into
`bot_players` and unions them into `global_leaderboard` with an `is_bot` flag
(the frontend renders them with a 🤖 marker). This solves the empty-leaderboard
cold start **honestly** — no fake human accounts. Their XP drifts daily via
`tick_bot_xp()`; schedule it (SQL editor, needs pg_cron):

```sql
select cron.schedule('tick-bot-xp', '10 0 * * *', $$ select public.tick_bot_xp(); $$);
```

## 6. Challenge links (the invite loop)

Migration `0013` adds the **invite system**: when a player finishes a case they
can mint a "challenge" link. The recipient lands on today's case with an
"X challenged you" intro and, after voting, a You-vs-them-vs-Arbi reveal.

It's built around the static-host + Supabase split:

- **`challenges` table + `challenge-cards` Storage bucket** (migration `0013`).
  The table is **spoiler-free by design** — it stores the challenger's *pick*
  (an opinion) and the question, but **never** the verdict, so a shared link
  can't reveal the answer to someone who hasn't played. The challenger's browser
  renders a 1200×630 preview card and uploads it to the public bucket.
- **`challenge` Edge Function** serves the per-link Open Graph preview. This is
  required because quorumdaily.com is a static SPA: social crawlers (WhatsApp,
  iMessage, Slack, X, Facebook, LinkedIn) read the HTML *without* running the
  app's JS, so they'd otherwise only ever see the one static card in
  `index.html`. The function returns dynamic `<meta>` tags for crawlers and
  redirects real visitors into the app at `…/?c=<id>`.

**Apply + deploy:**

```bash
# 1. Apply migration 0013 in the SQL editor (or: supabase db push).
#    It creates the table, the public Storage bucket, and the RLS policies.

# 2. Deploy the function PUBLIC (no JWT) so crawlers can fetch the preview:
supabase functions deploy challenge --no-verify-jwt
```

> The function only does a read-only lookup of a (non-secret) challenge row, so
> running it without a JWT is safe. `--no-verify-jwt` is required — crawlers
> can't send an auth header. Optionally set `QUORUM_SITE_URL` (defaults to
> `https://quorumdaily.com`) via `supabase secrets set`.

**Link styles** — controlled by `VITE_CHALLENGE_LINK_BASE` in `frontend/.env`.
We never expose the raw `…supabase.co/functions/v1/challenge/<id>` URL — it reads
like a phishing link and kills the share. The two supported styles:

- **Default (leave it blank): a clean app link on your own domain** —
  `https://quorumdaily.com/?c=<id>`. Zero web-server config; the app opens it to
  the "X challenged you" intro. The trade-off: social crawlers fall back to the
  site's generic Open Graph card (no personalised preview).
- **Recommended — pretty `quorumdaily.com/c/<id>` *with* a personalised
  preview:** proxy `/c/` to the `challenge` function so you keep the clean URL
  and the per-challenge "X challenges you" card. A ready-to-use config lives at
  [`deploy/nginx-challenge.conf`](../deploy/nginx-challenge.conf) (project ref
  pre-filled):

  ```bash
  # 1. Add the block to /etc/nginx/sites-enabled/quorumdaily (inside server { }),
  #    then:  nginx -t && systemctl reload nginx
  # 2. Set VITE_CHALLENGE_LINK_BASE=https://quorumdaily.com/c in frontend/.env
  # 3. Rebuild:  bash deploy.sh
  ```

## Notes / next steps

- **Hiding the verdict before close — done.** Migration `0005` restricts direct
  `case_options` reads to *closed* cases, so `is_judge_pick` can no longer be
  queried early. The live path is unaffected: the case is served via the
  `today_case` view (which omits the flag and runs with the view owner's
  privileges), and scoring happens server-side in the `submit-vote` Edge
  Function with the service-role key.
- **Daily rotation & bot drift** are handled by scheduled jobs (the
  `generate-daily-case` cron in §4 and the `tick-bot-xp` cron above).
- **Engagement (0009).** The judge's reasoning is stored on `daily_cases`
  (revealed only via `submit-vote` after a vote), and `submit-vote` scores a
  **confidence wager** (low/med/high) plus a **beat-the-crowd** bonus, recorded
  on the `votes` row. Redeploy `generate-daily-case` + `submit-vote` after
  applying `0009`.
- **Quest rewards (0011).** `quest_claims` is the idempotent claims ledger;
  `get_quest_state()` reports live progress and `claim_quest(quest_key)` grants
  the bonus XP into `total_xp` exactly once per daily/weekly period, validating
  completion server-side from the real vote history. No scheduled job needed —
  quests roll over automatically via the date/ISO-week period key.
- **League tier** is derived from real `total_xp` in the frontend
  (`leagueTier`), so Profile / Leagues / top-bar stay in sync.
- **Integrity hardening (0014).** Closes client-writable side doors so scoring
  stays server-authoritative: `votes` has no direct client INSERT and
  `user_progress` is read-only for clients (writes go through the edge function
  + SECURITY DEFINER RPCs, which bypass RLS). The privileged definer functions
  (`update_user_progress_after_vote`, `check_streak`, `tick_bot_xp`) are no
  longer executable by `public`. Voting now goes through `record_vote()`, which
  inserts the vote and updates progress in one transaction (and keeps `level`
  in sync on every vote, not just on quest claims).
- **Referral attribution (0015).** Records *who invited whom* — the foundation
  for an invite campaign (inviter rewards, conversion / K-factor, leaderboards).
  `challenges.challenger_id` captures who minted a link; `profiles.invited_by`
  (+ `invited_via_challenge`) captures the inviter who converted a new player.
  The recipient's client stashes the `?c=<id>` (so it survives the OAuth redirect,
  which drops the query string) and calls **`claim_referral(challenge_id)`** once
  after sign-in. That SECURITY DEFINER RPC enforces the rules server-side —
  set-once, no self-referral, and new-signups-only (profile created within 24h) —
  so attribution can't be forged or replayed. **`get_my_referral_stats()`**
  returns `invites_sent` / `friends_joined` for the inviter UI + leaderboards.
  No new deploy step: apply `0015` in the SQL editor (or `supabase db push`).
- **Invite rewards (0016).** Turns attribution into a two-sided incentive.
  *Inviter:* a claimable **`invite_friend`** quest ("Bring a friend to Quorum",
  150 XP) — it rides the existing `quest_defs` / `claim_quest` engine via a new
  `'invite'` period key (`'all'`, so it's claim-once-forever, no reset). *Invitee:*
  `claim_referral` now also grants a one-time **welcome XP bonus** (50) and returns
  the new total/level so the client reflects it immediately and shows a "you joined
  via {name} — challenge them back" toast. Profile surfaces *Friends joined* /
  *Invites sent* from `get_my_referral_stats()`. Apply `0016` **after** `0015`
  (it redefines `quest_defs` / `quest_period_key` / `quest_progress_value` /
  `claim_referral`, preserving the daily/weekly/monthly tiers from `0012`).
- **Personal invite links & founders (0017).** A second, identity-level invite
  surface alongside challenge links: every player gets one stable, reusable link
  (`quorumdaily.com/?i=<code>`). A recipient who joins via it becomes a
  **founding member** — `profiles.is_founder` (a Profile badge) plus a one-time
  **100 XP** welcome bonus — and is attributed to the inviter, so it also feeds
  the existing `invite_friend` quest + referral stats. There's **no access gate**:
  organic players still join freely (just not as founders). `claim_invite(code)`
  is a SECURITY DEFINER RPC with the same guards as `claim_referral` (set-once /
  no-self / new-signups-only); `get_my_invite()` powers the Profile "Invite
  friends" card (the caller's code, founder flag, friends-joined count). Codes are
  minted on signup (`handle_new_user`) and backfilled for existing players. No new
  deploy step: apply `0017` in the SQL editor (or `supabase db push`).
- **Still to wire (optional, currently presentational):** the schema's tiered
  **weekly league** cohort assignment + reset (`leagues` / `league_memberships`
  / `league_standings`); the all-time `global_leaderboard` stands in for now.
  That would need its own scheduled job.

## 6b. Daily reminder emails (Zoho ZeptoMail)

Migration `0018` + the `send-daily-reminder` Edge Function email every signed-up
player a once-a-day nudge that **today's question is live**. It reuses the exact
pattern as daily-case generation: a privileged Edge Function fired by `pg_cron`,
authorized by the service-role key (or a shared `x-cron-secret`).

**Why ZeptoMail?** For a code-driven, per-recipient daily send straight from your
Supabase signups, Zoho's transactional API ([ZeptoMail](https://www.zoho.com/zeptomail/))
is the right tool — a simple REST call + token, high limits, good deliverability.
(Zoho *Campaigns* is a newsletter UI that needs you to sync contacts into Zoho
lists; Zoho *Mail* SMTP has low caps. Neither fits an automated job as cleanly.)

**How it works:**

- **`email_preferences` table** (migration `0018`): one row per player holding
  the opt-in flag + an unguessable `unsubscribe_token`. We **still don't store
  emails** — the send job reads addresses from `auth.users` with the service-role
  key at send time (cf. migration 0001). A trigger seeds a row on signup and the
  migration backfills existing players.
- **`send-daily-reminder` Edge Function**: reads today's case (for the question),
  pages through `auth.users`, drops anyone who unsubscribed, and sends each player
  a personalised email via ZeptoMail (every message carries that player's own
  one-click unsubscribe link). Keep `verify_jwt` **on** — like generate-daily-case,
  only the cron/operator may call it.
- **Trigger: "whenever a new question is live."** Rather than a second timer,
  `generate-daily-case` calls `send-daily-reminder` itself right after it commits
  a new case — so the email fires exactly when the new question goes live. It's
  **off by default**: set `SEND_DAILY_REMINDER=true` to enable it. A manual/test
  case generation can suppress the blast with a `{ "skipEmail": true }` body. A
  mail failure is logged, never fatal (the case is already committed), and the
  reminder summary is echoed back on the generate-daily-case response under `email`.
- **`email-unsubscribe` Edge Function**: the public one-click opt-out target for
  the footer link. It authenticates on the per-row token alone (the click has no
  auth header), so deploy it `--no-verify-jwt`.

**Set the secrets** (`supabase/.env`, then push):

```bash
# Add to supabase/.env (see .env.example):
#   ZEPTOMAIL_TOKEN  (the send-mail token ONLY — no "Zoho-enczapikey " prefix)
#   EMAIL_FROM_ADDRESS=noreply@nazarbanai.com   (any address on your verified domain)
#   EMAIL_FROM_NAME, SEND_DAILY_REMINDER=true
supabase secrets set --env-file ./supabase/.env
```

> The `EMAIL_FROM_ADDRESS` domain must be **verified in ZeptoMail** (Mail Agents →
> Domains) or sends are rejected. The ZeptoMail Agent Alias and SMTP host are NOT
> needed — the API uses the send-mail token only. EU data-centre accounts: set
> `ZEPTOMAIL_API_URL=https://api.zeptomail.eu/v1.1/email`.

**Apply + deploy:**

```bash
# 1. Apply migration 0018 in the SQL editor (or: supabase db push).
# 2. Deploy the send job (keep JWT verification ON):
supabase functions deploy send-daily-reminder
# 3. Deploy the unsubscribe handler PUBLIC (the email click has no auth header):
supabase functions deploy email-unsubscribe --no-verify-jwt
# 4. Redeploy the case job so it triggers the email on each new question:
supabase functions deploy generate-daily-case
```

**That's the whole schedule.** Because `generate-daily-case` now fires the
reminder itself (when `SEND_DAILY_REMINDER=true`), there is **no separate email
cron** — the existing daily case cron (00:05 UTC, §4) drives both. The new
question goes live and the email goes out in the same step. To change *when*
players get pinged, change the case cron's time; the email follows.

**Smoke-test it safely first** (no blast): generate a case with email suppressed,
then send only to yourself by temporarily unsubscribing everyone else, or just
trigger the send job directly while your list is small:

```bash
# (a) regenerate a case WITHOUT emailing anyone:
curl -X POST '.../functions/v1/generate-daily-case' \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" -H "Content-Type: application/json" \
  -d '{"skipEmail": true}'

# (b) or fire just the email job by hand (service-role key; anon is rejected):
curl -X POST '.../functions/v1/send-daily-reminder' \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" -H "Content-Type: application/json"
# → {"ok":true,"caseNo":...,"recipients":N,"sent":N,"failed":0,"skippedUnsubscribed":M}
```

> **Volume note.** This Edge Function sends one API call per recipient with a
> small concurrency cap — perfect at launch scale. If your list grows into the
> tens of thousands, move to ZeptoMail's **batch** endpoint or chunk the send
> across several cron ticks so it stays within the function's wall-clock budget.

## 7. Analytics & feedback (frontend)

Both are optional and **off by default** (no third-party scripts ship unless you
opt in). Configure them in `frontend/.env`:

- `VITE_PLAUSIBLE_DOMAIN` — turn on cookieless [Plausible](https://plausible.io)
  analytics (page views + a few custom events: sign-in, vote locked, shares,
  founder joins). No cookie banner needed. Point `VITE_PLAUSIBLE_SRC` at a
  self-hosted instance if you don't use plausible.io.
- `VITE_FEEDBACK_URL` — the in-app "Feedback" links (footer) open this form;
  leave blank to fall back to a `mailto:` (update the address in
  `frontend/src/lib/feedback.ts`). The Privacy / Terms links point at the static
  `frontend/public/privacy.html` and `terms.html` pages.

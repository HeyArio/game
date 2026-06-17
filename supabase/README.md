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
`migrations/` in order (`0001` → `0009`). (Or, with the Supabase CLI linked to
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
(`get_player_stats`, computed from real vote history). The daily quests reflect
your live session progress and the weekly quest counts your real votes this
week; quest *claiming/rewards* and tiered weekly **league** resets are the main
remaining presentational pieces.

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
| 1 | GPT-OSS 120B | OpenRouter | `openai/gpt-oss-120b:free` |
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

**Generate the first case manually:**
```bash
supabase functions invoke generate-daily-case
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
- **Still to wire (optional, currently presentational):** quest reward
  claiming, and tiered **weekly league** assignment + reset (the all-time
  `global_leaderboard` stands in for now). These need their own scheduled jobs.

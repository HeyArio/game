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

Open **SQL Editor** in the Supabase dashboard, paste the contents of
`migrations/0001_init.sql`, and run it. (Or, with the Supabase CLI linked to the
project: `supabase db push`.)

This creates: `profiles`, `user_progress`, `daily_cases`, `case_options`,
`votes`, `leagues`, `league_memberships`, `quests`, `quest_progress`,
`achievements`, `user_achievements`, the `league_standings` leaderboard view,
a signup trigger that seeds a profile + progress row, and Row Level Security
policies on every table.

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

## 4. NVIDIA models + daily case generation

The `generate-daily-case` Edge Function calls 5 models from build.nvidia.com:

| Slot | Persona | Model |
|------|---------|-------|
| 1 | ASTRA  | `nvidia/nemotron-3-ultra-550b-a55b` |
| 2 | BOREAS | `minimaxai/minimax-m3` |
| 3 | CIRRUS | `mistralai/mistral-medium-3.5-128b` |
| 4 | DELPHI | `deepseek-ai/deepseek-v4-pro` |
| 5 | Arbi (judge) | `google/gemma-4-31b-it` |

These IDs are baked in as defaults — you do **not** need to set model env vars.
(Override any slot with `NVIDIA_MODEL_1`..`NVIDIA_MODEL_5` if you swap models.)

**Set the API key** — Supabase dashboard → **Settings → Edge Functions → Secrets**:
- `NVIDIA_API_KEY` — your build.nvidia.com key. One key works for all 5 models.
  (If you have separate keys per model, set `NVIDIA_API_KEY_1`..`NVIDIA_API_KEY_5`
  instead; per-slot keys take priority over the shared one.)

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

## Notes / next steps

- **Hiding the verdict before close.** `case_options.is_judge_pick` is the
  answer. RLS currently exposes option rows for any *open* case, which means a
  determined user could read the flag early via the API. For a competitive
  leaderboard this should be hardened: expose options through a
  `security definer` RPC that returns `is_judge_pick = null` until
  `closes_at <= now()`, and do scoring server-side (an Edge Function or RPC that
  records the vote, decides correctness, and awards XP) rather than in the
  client. The current frontend still scores locally (`selected === 'd'`) — that
  moves server-side when we wire real cases.
- **Daily rotation & league resets** want a scheduled job — use Supabase
  **cron** (pg_cron) or a scheduled Edge Function.

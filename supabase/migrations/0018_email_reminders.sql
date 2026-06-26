-- ============================================================================
-- Migration 0018 — daily email reminders + one-click unsubscribe
--
-- Adds the plumbing for a once-a-day "today's question is live" email to every
-- signed-up player, sent server-side via Zoho ZeptoMail (see the
-- `send-daily-reminder` Edge Function). Two design constraints shaped this:
--
--   * We still don't store emails ourselves (cf. 0001): identity lives in
--     `auth.users`, and the send job reads addresses from there with the
--     service-role key. This table holds only the *preference* (opted-in?) plus
--     an unguessable unsubscribe token — never the address.
--   * A daily blast legally needs a working one-click unsubscribe (CAN-SPAM /
--     GDPR) and it protects deliverability. Every player gets a per-row
--     `unsubscribe_token`; the public `email-unsubscribe` Edge Function flips
--     `daily_reminder` to false when someone clicks the footer link.
--
--   1. email_preferences        → one row per player: opt-in flag + token.
--   2. seed_email_prefs()       → seeds a row on signup (kept SEPARATE from
--      handle_new_user so we don't have to re-thread the 0017 invite logic).
--   3. backfill                 → a row for every existing player.
-- ============================================================================

-- ---------- 1. preference table ---------------------------------------------
create table if not exists public.email_preferences (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  daily_reminder     boolean     not null default true,
  -- 122 bits of entropy — unguessable, so the public unsubscribe link is safe
  -- without an auth handshake (the click comes from an email client, no JWT).
  unsubscribe_token  uuid        not null default gen_random_uuid(),
  last_reminder_at   timestamptz,
  created_at         timestamptz not null default now()
);

-- The send job looks players up by token when it builds each unsubscribe link,
-- and the unsubscribe function looks them up by token on click.
create unique index if not exists email_preferences_token_key
  on public.email_preferences (unsubscribe_token);

alter table public.email_preferences enable row level security;

-- A player may read their own preference row (e.g. to render an in-app toggle).
-- All writes go through the service-role edge functions, which bypass RLS — so
-- there is deliberately no client INSERT/UPDATE policy (cf. the 0014 hardening
-- that keeps state server-authoritative).
create policy "read own email prefs"
  on public.email_preferences for select to authenticated
  using (auth.uid() = user_id);

-- ---------- 2. seed a preference row on signup ------------------------------
-- A standalone trigger rather than folding this into handle_new_user(): that
-- function already carries the 0017 invite-code minting, and an independent
-- AFTER-INSERT trigger keeps the email concern decoupled (and re-run safe).
create or replace function public.seed_email_prefs()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.email_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_email_prefs on auth.users;
create trigger on_auth_user_created_email_prefs
  after insert on auth.users
  for each row execute function public.seed_email_prefs();

-- ---------- 3. backfill existing players ------------------------------------
insert into public.email_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

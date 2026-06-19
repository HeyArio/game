-- ============================================================================
-- Migration 0011 — claimable quest rewards (a real, server-validated economy)
--
-- The Quests screen previously showed "Claim" / chest / "+15" chips that nothing
-- in the backend ever granted. This wires a genuine reward loop:
--
--   * Quests are defined in one place (`quest_defs`) and are all *actually*
--     completable with one case per day (the old "match verdict twice" and
--     "judge 25 this week" goals were impossible).
--   * Progress is recomputed server-side from the real vote history — never
--     trusted from the client.
--   * `claim_quest()` grants the reward XP into user_progress.total_xp exactly
--     once per period, enforced by the `quest_claims` primary key (idempotent).
--   * `get_quest_state()` returns each quest's live progress + done + claimed so
--     the UI is driven entirely by the source of truth.
--
-- Reward currency is XP (it feeds level + league standing), so this is a real
-- economy rather than a separate currency with nothing to spend it on.
-- ============================================================================

-- ---------- claims ledger ---------------------------------------------------
-- One row per (user, quest, period). The PK is what makes a claim idempotent:
-- a second claim for the same period simply conflicts and grants nothing.
create table if not exists public.quest_claims (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  quest_key  text not null,
  period_key text not null,            -- e.g. '2026-06-19' (daily) or '2026W25' (weekly)
  reward_xp  int  not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_key, period_key)
);

alter table public.quest_claims enable row level security;
drop policy if exists "read own quest claims" on public.quest_claims;
create policy "read own quest claims"
  on public.quest_claims for select to authenticated using (auth.uid() = user_id);
-- Inserts happen only through the SECURITY DEFINER claim_quest() RPC below,
-- so there is intentionally no INSERT policy for clients.

-- ---------- quest catalogue -------------------------------------------------
-- Single source of truth for the four quests, shared by both RPCs. Reward XP is
-- modest relative to base scoring (low 30 / med 50 / high 100 per case) so the
-- bonus encourages the daily ritual without dwarfing skilled play.
create or replace function public.quest_defs()
returns table (quest_key text, qtype text, label text, goal int, reward_xp int)
language sql immutable as $$
  values
    ('daily_play',   'daily',  'Lock in today''s case',      1,  10),
    ('daily_match',  'daily',  'Match Arbi''s verdict today', 1,  25),
    ('daily_goal',   'daily',  'Hit your daily XP goal',     50, 15),
    ('weekly_judge', 'weekly', 'Judge 5 cases this week',     5, 200)
$$;

-- Period bucket a quest claim falls into (daily = UTC date, weekly = ISO week).
create or replace function public.quest_period_key(p_type text)
returns text language sql stable as $$
  select case
    when p_type = 'weekly' then to_char(date_trunc('week', now()), 'IYYY"W"IW')
    else to_char(now(), 'YYYY-MM-DD')
  end;
$$;

-- Live progress for one user + quest, computed from the real vote history.
-- SECURITY DEFINER and intentionally NOT granted to clients (it takes a user id
-- argument) — it is only ever called internally with the authenticated user.
create or replace function public.quest_progress_value(p_user uuid, p_key text)
returns int language sql stable security definer set search_path = public as $$
  select case p_key
    when 'daily_play' then
      (select count(*) from public.votes v
        where v.user_id = p_user and v.created_at >= current_date)::int
    when 'daily_match' then
      (select count(*) from public.votes v
        where v.user_id = p_user and v.created_at >= current_date and v.was_correct)::int
    when 'daily_goal' then
      coalesce((select sum(v.xp_earned) from public.votes v
        where v.user_id = p_user and v.created_at >= current_date), 0)::int
    when 'weekly_judge' then
      (select count(*) from public.votes v
        where v.user_id = p_user and v.created_at >= date_trunc('week', now()))::int
    else 0
  end;
$$;
revoke all on function public.quest_progress_value(uuid, text) from public, anon, authenticated;

-- ---------- read: live quest state for the current user ---------------------
create or replace function public.get_quest_state()
returns table (
  quest_key  text,
  label      text,
  qtype      text,
  progress   int,
  goal       int,
  reward_xp  int,
  done       boolean,
  claimed    boolean
)
language sql stable security definer set search_path = public as $$
  select
    d.quest_key,
    d.label,
    d.qtype,
    least(public.quest_progress_value(auth.uid(), d.quest_key), d.goal) as progress,
    d.goal,
    d.reward_xp,
    public.quest_progress_value(auth.uid(), d.quest_key) >= d.goal      as done,
    exists (
      select 1 from public.quest_claims c
      where c.user_id = auth.uid()
        and c.quest_key = d.quest_key
        and c.period_key = public.quest_period_key(d.qtype)
    ) as claimed
  from public.quest_defs() d;
$$;
revoke all on function public.get_quest_state() from public;
grant execute on function public.get_quest_state() to authenticated;

-- ---------- write: claim a completed quest (idempotent) ---------------------
create or replace function public.claim_quest(p_quest_key text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user     uuid := auth.uid();
  v_def      record;
  v_period   text;
  v_progress int;
  v_total    int;
  v_level    int;
  v_inserted int;
begin
  if v_user is null then
    return json_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select * into v_def from public.quest_defs() d where d.quest_key = p_quest_key;
  if not found then
    return json_build_object('ok', false, 'reason', 'unknown_quest');
  end if;

  -- Server-side completion check — the client's view is never trusted.
  v_progress := public.quest_progress_value(v_user, p_quest_key);
  if v_progress < v_def.goal then
    return json_build_object('ok', false, 'reason', 'incomplete');
  end if;

  v_period := public.quest_period_key(v_def.qtype);

  -- Idempotent: the PK rejects a second claim for the same period, so the
  -- reward below only runs on the first successful insert.
  insert into public.quest_claims (user_id, quest_key, period_key, reward_xp)
  values (v_user, p_quest_key, v_period, v_def.reward_xp)
  on conflict (user_id, quest_key, period_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select total_xp, level into v_total, v_level
    from public.user_progress where user_id = v_user;
    return json_build_object(
      'ok', true, 'already', true, 'reward_xp', 0,
      'total_xp', coalesce(v_total, 0), 'level', coalesce(v_level, 1)
    );
  end if;

  update public.user_progress
  set total_xp   = total_xp + v_def.reward_xp,
      level      = greatest(1, floor((total_xp + v_def.reward_xp) / 500) + 1),
      updated_at = now()
  where user_id = v_user
  returning total_xp, level into v_total, v_level;

  return json_build_object(
    'ok', true, 'already', false, 'reward_xp', v_def.reward_xp,
    'total_xp', v_total, 'level', v_level
  );
end;
$$;
revoke all on function public.claim_quest(text) from public;
grant execute on function public.claim_quest(text) to authenticated;

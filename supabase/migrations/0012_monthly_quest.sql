-- ============================================================================
-- Migration 0012 — add a monthly quest tier
--
-- Quests need no generation step or cron: the definitions are static and the
-- period key rolls over on its own (a new UTC day / ISO week / calendar month
-- yields a fresh period_key, so progress resets and the quest becomes claimable
-- again automatically). This migration just adds the monthly tier alongside the
-- existing daily + weekly ones by replacing the three quest helper functions.
-- get_quest_state() / claim_quest() are unchanged — they iterate quest_defs().
-- ============================================================================

create or replace function public.quest_defs()
returns table (quest_key text, qtype text, label text, goal int, reward_xp int)
language sql immutable as $$
  values
    ('daily_play',    'daily',   'Lock in today''s case',        1,  10),
    ('daily_match',   'daily',   'Match Arbi''s verdict today',   1,  25),
    ('daily_goal',    'daily',   'Hit your daily XP goal',       50,  15),
    ('weekly_judge',  'weekly',  'Judge 5 cases this week',       5, 200),
    ('monthly_judge', 'monthly', 'Judge 20 cases this month',    20, 500)
$$;

create or replace function public.quest_period_key(p_type text)
returns text language sql stable as $$
  select case p_type
    when 'weekly'  then to_char(date_trunc('week',  now()), 'IYYY"W"IW')
    when 'monthly' then to_char(date_trunc('month', now()), 'YYYY"M"MM')
    else to_char(now(), 'YYYY-MM-DD')
  end;
$$;

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
    when 'monthly_judge' then
      (select count(*) from public.votes v
        where v.user_id = p_user and v.created_at >= date_trunc('month', now()))::int
    else 0
  end;
$$;
revoke all on function public.quest_progress_value(uuid, text) from public, anon, authenticated;

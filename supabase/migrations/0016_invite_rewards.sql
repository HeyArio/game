-- ============================================================================
-- Migration 0016 — invite rewards (the reason to send, and to accept)
--
-- 0015 recorded WHO invited WHOM but left it invisible to players. This adds the
-- two-sided incentive that actually drives sharing, on top of the existing
-- attribution + quest engine:
--
--   * Inviter: a claimable "Bring a friend to Quorum" quest (qtype 'invite'),
--     worth 150 XP. It rides the existing quest_defs / claim_quest machinery —
--     progress = friends attributed to you, claimable once ever.
--   * Invitee: a one-time welcome XP bonus granted the moment claim_referral()
--     attributes them, so arriving via a friend's link feels rewarding instead
--     of landing them on a cold start.
--
-- Quests need no cron: a new 'invite' period key ('all') makes the inviter quest
-- claim-once-forever, exactly as 0012's daily/weekly/monthly keys roll over on
-- their own. get_quest_state() / claim_quest() are unchanged — they iterate
-- quest_defs() and key claims by quest_period_key(qtype).
-- ============================================================================

-- ---------- quest catalogue: add the invite quest ---------------------------
-- Re-declares the full set (cf. 0012) so the daily/weekly/monthly tiers are
-- preserved; only the trailing 'invite' row is new.
create or replace function public.quest_defs()
returns table (quest_key text, qtype text, label text, goal int, reward_xp int)
language sql immutable as $$
  values
    ('daily_play',    'daily',   'Lock in today''s case',        1,  10),
    ('daily_match',   'daily',   'Match Arbi''s verdict today',   1,  25),
    ('daily_goal',    'daily',   'Hit your daily XP goal',       50,  15),
    ('weekly_judge',  'weekly',  'Judge 5 cases this week',       5, 200),
    ('monthly_judge', 'monthly', 'Judge 20 cases this month',    20, 500),
    ('invite_friend', 'invite',  'Bring a friend to Quorum',      1, 150)
$$;

-- ---------- period key: 'invite' is claim-once-forever ----------------------
-- A constant period bucket means the (user, quest, period) PK in quest_claims
-- permits exactly one successful claim, ever — no daily/weekly reset.
create or replace function public.quest_period_key(p_type text)
returns text language sql stable as $$
  select case p_type
    when 'invite'  then 'all'
    when 'weekly'  then to_char(date_trunc('week',  now()), 'IYYY"W"IW')
    when 'monthly' then to_char(date_trunc('month', now()), 'YYYY"M"MM')
    else to_char(now(), 'YYYY-MM-DD')
  end;
$$;

-- ---------- progress: count friends this player brought in ------------------
-- Re-declares the full set (cf. 0012) plus the invite branch, computed from the
-- real attribution edge (profiles.invited_by) — never trusted from the client.
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
    when 'invite_friend' then
      (select count(*) from public.profiles p where p.invited_by = p_user)::int
    else 0
  end;
$$;
revoke all on function public.quest_progress_value(uuid, text) from public, anon, authenticated;

-- ---------- invitee welcome bonus -------------------------------------------
-- Supersedes the 0015 definition: same guards (set-once / no self-referral /
-- new-signups-only), but now also grants a one-time welcome XP bonus to the
-- newly-attributed player and returns the authoritative new total/level so the
-- client can reflect it immediately (mirrors claim_quest's contract). The bonus
-- is tied to the row we actually set (row_count), so a concurrent double-claim
-- can never grant it twice.
create or replace function public.claim_referral(p_challenge_id text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user       uuid := auth.uid();
  v_challenger uuid;
  v_existing   uuid;
  v_created    timestamptz;
  v_name       text;
  v_bonus      int := 50;   -- one-time welcome XP for the attributed player
  v_updated    int;
  v_total      int;
  v_level      int;
begin
  if v_user is null then
    return json_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select challenger_id into v_challenger
  from public.challenges where id = p_challenge_id;

  if not found then
    return json_build_object('ok', false, 'reason', 'unknown_challenge');
  end if;
  if v_challenger is null then
    return json_build_object('ok', false, 'reason', 'no_challenger');
  end if;
  if v_challenger = v_user then
    return json_build_object('ok', false, 'reason', 'self');
  end if;

  select invited_by, created_at into v_existing, v_created
  from public.profiles where id = v_user;

  if v_existing is not null then
    return json_build_object('ok', true, 'already', true);
  end if;
  if v_created is null or v_created < now() - interval '24 hours' then
    return json_build_object('ok', false, 'reason', 'not_new');
  end if;

  update public.profiles
  set invited_by = v_challenger,
      invited_via_challenge = p_challenge_id
  where id = v_user and invited_by is null;  -- set-once, even under a race
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    update public.user_progress
    set total_xp   = total_xp + v_bonus,
        level      = greatest(1, floor((total_xp + v_bonus) / 500) + 1),
        updated_at = now()
    where user_id = v_user
    returning total_xp, level into v_total, v_level;
  else
    -- A concurrent claim won the set-once race: grant nothing, report truth.
    v_bonus := 0;
    select total_xp, level into v_total, v_level
    from public.user_progress where user_id = v_user;
  end if;

  select display_name into v_name from public.profiles where id = v_challenger;

  return json_build_object(
    'ok', true, 'already', false,
    'bonus_xp', v_bonus,
    'total_xp', coalesce(v_total, 0),
    'level', coalesce(v_level, 1),
    'inviter_name', coalesce(nullif(trim(v_name), ''), 'A Quorum player')
  );
end;
$$;

revoke all on function public.claim_referral(text) from public, anon, authenticated;
grant execute on function public.claim_referral(text) to authenticated;

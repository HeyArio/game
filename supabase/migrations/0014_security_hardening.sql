-- ============================================================================
-- Migration 0014 — security hardening (leaderboard / XP integrity)
--
-- The product is server-authoritative by design: scoring happens in the
-- submit-vote Edge Function (service role) and the SECURITY DEFINER RPCs. But
-- a few policies/grants from earlier migrations left client-writable side doors
-- that bypass that authority. This migration closes them WITHOUT changing the
-- live app paths (the frontend only ever READS these tables and writes via the
-- RPCs / edge function — verified against the client code).
--
--   1. votes: drop the direct client INSERT policy. A player could otherwise
--      insert rows with was_correct=true / arbitrary xp_earned, which inflates
--      get_player_stats AND feeds quest_progress_value (→ fraudulent claims).
--      The real vote path is the submit-vote function (service role, bypasses
--      RLS), so clients never need INSERT.
--
--   2. user_progress: downgrade from FOR ALL to SELECT-only. A player could
--      otherwise UPDATE their own total_xp/streak/level to anything and top the
--      leaderboard. All writes go through SECURITY DEFINER RPCs (which bypass
--      RLS), so read-only is sufficient for the client.
--
--   3. SECURITY DEFINER functions that were left EXECUTABLE BY PUBLIC and take a
--      caller-supplied user id or mutate global state:
--        - update_user_progress_after_vote(uuid,int,bool): grants arbitrary XP.
--        - check_streak(uuid): could reset ANY user's streak (griefing).
--        - tick_bot_xp(): could be spammed to inflate every bot.
--      Revoke from public/anon/authenticated; grant only to service_role where a
--      privileged caller (cron / edge function) needs it.
--
--   4. record_vote(): new SECURITY DEFINER RPC that inserts the vote AND updates
--      progress in a SINGLE transaction (a plpgsql function body is atomic), so
--      a failure can no longer leave a vote with no XP. Idempotent via ON
--      CONFLICT, which also turns the concurrent double-submit race into a clean
--      "already voted" signal instead of a 500.
-- ============================================================================

-- ---------- 1. votes: no direct client inserts --------------------------------
drop policy if exists "cast own vote" on public.votes;
-- (the "read own votes" SELECT policy from 0001 is intentionally kept)

-- ---------- 2. user_progress: read-only for clients ---------------------------
drop policy if exists "own progress" on public.user_progress;
drop policy if exists "read own progress" on public.user_progress;  -- re-runnable
create policy "read own progress"
  on public.user_progress for select to authenticated
  using (auth.uid() = user_id);

-- ---------- 2b. fix update_user_progress_after_vote --------------------------
-- Two corrections vs. 0003 (redefined here; 0003 stays as applied history):
--   * keep `level` in sync on every vote (0003 only ever updated total_xp, so
--     level went stale between quest claims — claim_quest was the only writer).
--     Mirrors the floor(xp/500)+1 curve used by claim_quest + global_leaderboard.
--   * drop the dead quest_progress updates: migration 0011 replaced that table
--     with quest_defs()/get_quest_state(), which derive progress from the vote
--     history and never read quest_progress. Those UPDATEs matched nothing.
create or replace function public.update_user_progress_after_vote(
  p_user_id     uuid,
  p_xp_earned   int,
  p_was_correct boolean
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_last_vote_date date;
  v_today          date := current_date;
  v_streak         int;
  v_best           int;
  v_cont           int;
begin
  -- Last vote date (excluding today's, which we're about to insert)
  select date(created_at) into v_last_vote_date
  from public.votes
  where user_id = p_user_id
    and date(created_at) < v_today
  order by created_at desc limit 1;

  select streak, best_streak, continuance_count
    into v_streak, v_best, v_cont
  from public.user_progress where user_id = p_user_id;

  -- Streak logic (unchanged from 0003)
  if v_last_vote_date is null then
    v_streak := 1;                              -- first ever vote
  elsif v_last_vote_date = v_today - 1 then
    v_streak := v_streak + 1;                   -- consecutive day
  elsif v_last_vote_date < v_today - 1 and v_cont > 0 then
    update public.user_progress                 -- missed a day, burn a shield
      set continuance_count = continuance_count - 1, updated_at = now()
    where user_id = p_user_id;
  elsif v_last_vote_date < v_today - 1 then
    v_streak := 1;                              -- streak broke
  end if;

  v_best := greatest(v_best, v_streak);

  update public.user_progress
  set
    streak      = v_streak,
    best_streak = v_best,
    total_xp    = total_xp + p_xp_earned,
    level       = greatest(1, floor((total_xp + p_xp_earned) / 500) + 1),
    daily_xp    = case
                    when date(updated_at) < v_today then p_xp_earned
                    else daily_xp + p_xp_earned
                  end,
    updated_at  = now()
  where user_id = p_user_id;
end;
$$;

-- ---------- 3. lock down PUBLIC-executable SECURITY DEFINER functions ---------
revoke all on function public.update_user_progress_after_vote(uuid, int, boolean)
  from public, anon, authenticated;
grant execute on function public.update_user_progress_after_vote(uuid, int, boolean)
  to service_role;

-- check_streak (0002) and tick_bot_xp (0006) come from earlier migrations. Guard
-- each with to_regprocedure so this hardening migration still applies cleanly if
-- the live DB has drifted from the committed history and one of them is absent:
-- a missing function has nothing to lock down, so skipping is the correct no-op.
-- (A bare REVOKE on a non-existent function raises 42883 and aborts the script.)
do $$
begin
  -- check_streak is unused by the app (update_user_progress_after_vote owns the
  -- streak logic); leave it grant-less so nothing but the owner can run it.
  if to_regprocedure('public.check_streak(uuid)') is not null then
    execute 'revoke all on function public.check_streak(uuid) from public, anon, authenticated';
  end if;

  if to_regprocedure('public.tick_bot_xp()') is not null then
    execute 'revoke all on function public.tick_bot_xp() from public, anon, authenticated';
    execute 'grant execute on function public.tick_bot_xp() to service_role';  -- daily cron
  end if;
end $$;

-- ---------- 4. atomic vote write ---------------------------------------------
create or replace function public.record_vote(
  p_user_id               uuid,
  p_case_id               uuid,
  p_option_id             uuid,
  p_was_correct           boolean,
  p_xp_earned             int,
  p_confidence            text,
  p_crowd_guess_option_id uuid,
  p_crowd_correct         boolean
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_inserted int;
begin
  insert into public.votes (
    user_id, case_id, option_id, was_correct, xp_earned,
    confidence, crowd_guess_option_id, crowd_correct
  ) values (
    p_user_id, p_case_id, p_option_id, p_was_correct, p_xp_earned,
    p_confidence, p_crowd_guess_option_id, p_crowd_correct
  )
  on conflict (user_id, case_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;  -- already voted (incl. a concurrent double-submit): no change
  end if;

  -- Same transaction as the insert; runs as the function owner so it works
  -- regardless of the (now revoked) public execute grant.
  perform public.update_user_progress_after_vote(p_user_id, p_xp_earned, p_was_correct);
  return true;
end;
$$;

revoke all on function
  public.record_vote(uuid, uuid, uuid, boolean, int, text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function
  public.record_vote(uuid, uuid, uuid, boolean, int, text, uuid, boolean)
  to service_role;

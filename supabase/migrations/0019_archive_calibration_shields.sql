-- ============================================================================
-- Migration 0019 — case archive, calibration stats, earnable streak shields
--
-- Three retention features the daily loop was missing:
--
--   1. get_case_archive(): the back-catalog. Every closed case with its four
--      options, the judge's pick + reasoning, the final crowd split, and the
--      caller's own vote. For a judgment game the archive IS the study
--      material — it's what makes agreement % feel earned and Arbi learnable.
--      Verdicts are only exposed for CLOSED cases (same rule as migration
--      0005's case_options policy), so nothing here can leak today's answer.
--
--   2. get_calibration_stats(): per-confidence accuracy (Safe/Balanced/Bold),
--      crowd-bet accuracy, and per-category agreement — computed from the
--      vote history that already records confidence + crowd_correct. This is
--      the stat that makes the wager panel matter long-term.
--
--   3. Earnable Continuances: +1 streak shield at every 7-day streak
--      milestone (capped at 3). The burn logic has existed since 0003; this
--      adds the earn side, so shields are a renewable reward for consistency
--      instead of a two-use lifetime allowance.
-- ============================================================================

-- ---------- 1. case archive --------------------------------------------------
create or replace function public.get_case_archive(
  p_limit          int default 30,
  p_before_case_no int default null
)
returns table (
  case_no         int,
  question        text,
  category        text,
  closed_at       timestamptz,
  judge_reasoning text,
  options         json,
  my_letter       text,
  my_correct      boolean,
  my_confidence   text,
  my_xp           int
)
language sql stable security definer set search_path = public as $$
  select
    dc.case_no,
    dc.question,
    dc.category,
    dc.closes_at as closed_at,
    dc.judge_reasoning,
    (
      select coalesce(
        json_agg(
          json_build_object(
            'letter',        co.letter,
            'model_name',    co.model_name,
            'pick',          co.pick,
            'rationale',     co.rationale,
            'is_judge_pick', co.is_judge_pick,
            'final_pct',     coalesce(cvs.pct, co.crowd_pct)
          ) order by co.letter
        ), '[]'::json)
      from public.case_options co
      left join public.case_vote_summary cvs
        on cvs.case_id = dc.id and cvs.option_id = co.id
      where co.case_id = dc.id
    ) as options,
    mv.letter        as my_letter,
    mv.was_correct   as my_correct,
    mv.confidence    as my_confidence,
    mv.xp_earned     as my_xp
  from public.daily_cases dc
  left join lateral (
    select co2.letter, v.was_correct, v.confidence, v.xp_earned
    from public.votes v
    join public.case_options co2 on co2.id = v.option_id
    where v.case_id = dc.id and v.user_id = auth.uid()
    limit 1
  ) mv on true
  where dc.closes_at <= now()
    and (p_before_case_no is null or dc.case_no < p_before_case_no)
  order by dc.case_no desc
  limit least(greatest(coalesce(p_limit, 30), 1), 60);
$$;

revoke all on function public.get_case_archive(int, int) from public, anon;
grant execute on function public.get_case_archive(int, int) to authenticated;

-- ---------- 2. calibration stats ----------------------------------------------
create or replace function public.get_calibration_stats()
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'by_confidence', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select
          v.confidence,
          count(*)::int                                  as cases,
          count(*) filter (where v.was_correct)::int     as correct
        from public.votes v
        where v.user_id = auth.uid()
        group by v.confidence
      ) t
    ),
    'crowd', (
      select row_to_json(c) from (
        select
          count(*) filter (where v.crowd_guess_option_id is not null)::int as bets,
          count(*) filter (where v.crowd_correct)::int                     as hits
        from public.votes v
        where v.user_id = auth.uid()
      ) c
    ),
    'by_category', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select
          dc.category,
          count(*)::int                              as cases,
          count(*) filter (where v.was_correct)::int as correct
        from public.votes v
        join public.daily_cases dc on dc.id = v.case_id
        where v.user_id = auth.uid()
        group by dc.category
        order by count(*) desc
        limit 6
      ) t
    )
  );
$$;

revoke all on function public.get_calibration_stats() from public, anon;
grant execute on function public.get_calibration_stats() to authenticated;

-- ---------- 3. earnable streak shields -----------------------------------------
-- Redefines update_user_progress_after_vote (cf. 0014, which stays as applied
-- history). One change: hitting a 7-day streak milestone (7, 14, 21, …) grants
-- +1 continuance, capped at 3. Fires at most once per milestone because there
-- is exactly one vote per day, so a given streak value is reached exactly once
-- per run. Level sync + dead-quest-table removal from 0014 are preserved.
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
  v_milestone      boolean := false;
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

  -- Streak logic (unchanged from 0003/0014). The milestone flag is set only on
  -- the branches where the streak actually ADVANCES to a multiple of 7 — a
  -- shield-burn day keeps the same streak value and must not re-grant (else a
  -- burned shield would be refunded and the missed day would be free).
  if v_last_vote_date is null then
    v_streak := 1;                              -- first ever vote
  elsif v_last_vote_date = v_today - 1 then
    v_streak := v_streak + 1;                   -- consecutive day
    v_milestone := (v_streak % 7 = 0);
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
    -- Milestone reward: a fresh shield every 7 consecutive days, max 3 held.
    continuance_count = case
                          when v_milestone then least(continuance_count + 1, 3)
                          else continuance_count
                        end,
    updated_at  = now()
  where user_id = p_user_id;
end;
$$;

-- Re-assert the 0014 lockdown (CREATE OR REPLACE keeps grants, but be explicit).
revoke all on function public.update_user_progress_after_vote(uuid, int, boolean)
  from public, anon, authenticated;
grant execute on function public.update_user_progress_after_vote(uuid, int, boolean)
  to service_role;

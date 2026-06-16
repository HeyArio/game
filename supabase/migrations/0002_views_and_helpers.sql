-- ============================================================================
-- Migration 0002 — live crowd percentages view + vote RPC + question queue
-- ============================================================================

-- Case vote summary (live crowd percentages from real votes)
create or replace view public.case_vote_summary as
  select
    v.case_id,
    v.option_id,
    count(*) as vote_count,
    round(
      count(*) * 100.0 / nullif(sum(count(*)) over (partition by v.case_id), 0)
    , 0)::int as pct
  from public.votes v
  group by v.case_id, v.option_id;

-- Today's open case (shortcut for the frontend)
create or replace view public.today_case as
  select
    dc.id,
    dc.case_no,
    dc.question,
    dc.category,
    dc.opens_at,
    dc.closes_at,
    coalesce(
      json_agg(
        json_build_object(
          'id',         co.id,
          'letter',     co.letter,
          'model_name', co.model_name,
          'pick',       co.pick,
          'rationale',  co.rationale,
          'crowd_pct',  coalesce(cvs.pct, co.crowd_pct)
          -- is_judge_pick is deliberately NOT included here;
          -- the submit-vote function returns it after the vote is cast
        ) order by co.letter
      ), '[]'::json
    ) as options
  from public.daily_cases dc
  join public.case_options co on co.case_id = dc.id
  left join public.case_vote_summary cvs
    on cvs.case_id = dc.id and cvs.option_id = co.id
  where dc.opens_at <= now() and dc.closes_at > now()
  group by dc.id, dc.case_no, dc.question, dc.category, dc.opens_at, dc.closes_at;

-- RLS on today_case view: authenticated only
-- (views inherit RLS of underlying tables, but add a grant for clarity)
grant select on public.today_case to authenticated;
grant select on public.case_vote_summary to authenticated;

-- ============================================================================
-- Streak helper: resets streak if user missed yesterday and has no continuance
-- ============================================================================
create or replace function public.check_streak(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_last_vote_date date;
  v_streak int;
  v_cont int;
begin
  select date(created_at) into v_last_vote_date
  from public.votes
  where user_id = p_user_id
  order by created_at desc limit 1;

  select streak, continuance_count into v_streak, v_cont
  from public.user_progress where user_id = p_user_id;

  -- If the last vote was before yesterday, the streak may have broken
  if v_last_vote_date is not null and v_last_vote_date < current_date - 1 then
    if v_cont > 0 then
      -- burn a continuance
      update public.user_progress
        set continuance_count = continuance_count - 1, updated_at = now()
      where user_id = p_user_id;
    else
      -- streak resets
      update public.user_progress
        set streak = 0, updated_at = now()
      where user_id = p_user_id;
    end if;
  end if;
end;
$$;

-- ============================================================================
-- Seed: sample daily cases so day 1 works even before the cron fires
-- (the Edge Function will overwrite these with AI-generated content)
-- ============================================================================
insert into public.daily_cases (id, case_no, question, category, opens_at, closes_at) values
  (gen_random_uuid(), 218, 'Who will win the 2026 FIFA World Cup?',
   'SPORT · FORECAST',
   now() - interval '1 hour',
   now() + interval '23 hours')
on conflict (case_no) do nothing;

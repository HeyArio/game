-- ============================================================================
-- Migration 0003 — update_user_progress_after_vote RPC
-- Called by the submit-vote Edge Function after a successful vote.
-- ============================================================================

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

  -- Streak logic
  if v_last_vote_date is null then
    -- First ever vote
    v_streak := 1;
  elsif v_last_vote_date = v_today - 1 then
    -- Consecutive day
    v_streak := v_streak + 1;
  elsif v_last_vote_date < v_today - 1 and v_cont > 0 then
    -- Missed a day but continuance covers it — don't reset, just burn the shield
    update public.user_progress
      set continuance_count = continuance_count - 1, updated_at = now()
    where user_id = p_user_id;
    -- streak continues unchanged
  elsif v_last_vote_date < v_today - 1 then
    -- Streak broke
    v_streak := 1;
  end if;

  v_best := greatest(v_best, v_streak);

  -- Reset daily_xp at the start of each new day (crude: compare to last updated_at date)
  update public.user_progress
  set
    streak      = v_streak,
    best_streak = v_best,
    total_xp    = total_xp + p_xp_earned,
    daily_xp    = case
                    when date(updated_at) < v_today then p_xp_earned
                    else daily_xp + p_xp_earned
                  end,
    updated_at  = now()
  where user_id = p_user_id;

  -- Update quest progress: "keep streak alive"
  update public.quest_progress qp
  set count = least(qp.count + 1, q.goal_count),
      completed_at = case when qp.count + 1 >= q.goal_count then now() else qp.completed_at end
  from public.quests q
  where q.id = qp.quest_id
    and qp.user_id = p_user_id
    and q.type = 'daily'
    and q.label ilike '%streak%'
    and qp.completed_at is null
    and q.period_end > now();

  -- Update quest progress: "match verdict"
  if p_was_correct then
    update public.quest_progress qp
    set count = least(qp.count + 1, q.goal_count),
        completed_at = case when qp.count + 1 >= q.goal_count then now() else qp.completed_at end
    from public.quests q
    where q.id = qp.quest_id
      and qp.user_id = p_user_id
      and q.type = 'daily'
      and q.label ilike '%verdict%'
      and qp.completed_at is null
      and q.period_end > now();
  end if;
end;
$$;

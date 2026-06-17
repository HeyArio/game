-- ============================================================================
-- Migration 0007 — real player stats for the Profile + Quests screens
--
-- Replaces hardcoded figures ("218 cases judged", "72% agreement", weekly
-- quest "18/25") with values computed from the user's actual vote history.
-- SECURITY DEFINER + auth.uid() so a user only ever sees their own numbers
-- (votes RLS otherwise already limits reads to own rows).
-- ============================================================================

create or replace function public.get_player_stats()
returns table (
  cases_judged    int,
  correct_count   int,
  agreement_pct   int,
  votes_this_week int,
  best_streak     int
)
language sql security definer set search_path = public as $$
  select
    count(v.*)::int                                              as cases_judged,
    count(v.*) filter (where v.was_correct)::int                as correct_count,
    coalesce(
      round(count(v.*) filter (where v.was_correct) * 100.0
            / nullif(count(v.*), 0))::int, 0)                    as agreement_pct,
    count(v.*) filter (
      where v.created_at >= date_trunc('week', now()))::int     as votes_this_week,
    coalesce((select up.best_streak from public.user_progress up
              where up.user_id = auth.uid()), 0)                 as best_streak
  from public.votes v
  where v.user_id = auth.uid();
$$;

grant execute on function public.get_player_stats() to authenticated;

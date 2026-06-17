-- ============================================================================
-- Migration 0005 — hide the verdict until a case closes (anti-cheat)
--
-- Problem: migration 0001's "options readable for open cases" policy let any
-- authenticated user SELECT * directly from case_options for an OPEN case —
-- including is_judge_pick. A determined player could query the table from the
-- browser and always pick the winner, making the leaderboard meaningless.
--
-- Fix: only allow DIRECT reads of case_options AFTER the case closes (for
-- post-mortem review). Before close, the app gets options through the
-- `today_case` view (which omits is_judge_pick and runs with the view owner's
-- privileges, bypassing this policy), and scoring happens server-side in the
-- submit-vote Edge Function using the service-role key. So nothing in the live
-- product path needs direct pre-close access.
-- ============================================================================

drop policy if exists "options readable for open cases" on public.case_options;

create policy "options readable after close"
  on public.case_options for select to authenticated
  using (exists (
    select 1 from public.daily_cases c
    where c.id = case_id and c.closes_at <= now()
  ));

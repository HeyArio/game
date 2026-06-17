-- ============================================================================
-- Migration 0009 — engagement features
--
--  1. Reveal reasoning      → daily_cases.judge_reasoning (Arbi's "why")
--  2. Confidence wager      → votes.confidence + variable XP (scored server-side)
--  3. Beat-the-crowd bet    → votes.crowd_guess_option_id + votes.crowd_correct
--
-- judge_reasoning is intentionally NOT added to the today_case view — it would
-- reveal the winner. It's returned only by the submit-vote function after a vote.
-- ============================================================================

alter table public.daily_cases
  add column if not exists judge_reasoning text;

alter table public.votes
  add column if not exists confidence            text,           -- 'low' | 'med' | 'high'
  add column if not exists crowd_guess_option_id uuid references public.case_options (id),
  add column if not exists crowd_correct         boolean;

-- ============================================================================
-- Migration 0010 — let logged-out visitors preview today's case (read-only)
--
-- Goal: someone who follows a shared result link (WhatsApp/Telegram/etc.) or
-- lands on the site should be able to read today's question and the four AI
-- answers BEFORE creating an account, then be prompted to sign in to lock in a
-- pick, see Arbi's verdict, and start a streak.
--
-- Safety: the `today_case` view deliberately omits `is_judge_pick` and runs
-- with the view owner's privileges (see migration 0005), so granting anon read
-- on the view exposes only the publicly-safe fields — never the verdict. Voting
-- still requires an authenticated user (votes table RLS is unchanged), so this
-- does not open up scoring or leaderboard manipulation.
-- ============================================================================

grant select on public.today_case to anon;

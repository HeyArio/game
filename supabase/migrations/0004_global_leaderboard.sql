-- ============================================================================
-- Migration 0004 — global leaderboard
--
-- A simple all-time leaderboard ranking every player by total XP. This powers
-- the Leagues page and the play-screen rail with REAL data, without needing
-- league/membership rows to be seeded first. (The tiered `league_standings`
-- view from 0001 still exists for when weekly leagues are wired up.)
-- ============================================================================

create or replace view public.global_leaderboard as
  select
    p.id            as user_id,
    p.display_name,
    p.avatar_color,
    up.total_xp,
    up.streak,
    up.level,
    rank() over (order by up.total_xp desc, up.updated_at asc) as rank
  from public.profiles p
  join public.user_progress up on up.user_id = p.id;

grant select on public.global_leaderboard to authenticated;

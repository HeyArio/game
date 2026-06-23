-- ============================================================================
-- Migration 0015 — referral attribution (the invite campaign's foundation)
--
-- Challenge links already drive the viral loop, but nothing recorded WHO invited
-- WHOM. A challenge stored only a display-name string (challenger_name), and a
-- new player's profile had no link back to the friend whose link converted them.
-- Without that edge you cannot reward inviters, measure conversion / K-factor, or
-- build an inviter leaderboard — i.e. you cannot actually run an invite campaign.
--
-- This migration adds the missing edges and a guarded way to record them:
--   1. challenges.challenger_id        → the player who minted the link.
--   2. profiles.invited_by             → the inviter who converted this player.
--      profiles.invited_via_challenge  → the specific link that did it (funnel).
--   3. claim_referral()        → SECURITY DEFINER RPC the recipient calls once
--      after signing up; enforces set-once, no self-referral, new-users-only.
--   4. get_my_referral_stats() → read model for "N friends joined" + leaderboards.
--
-- Mirrors the project's server-authoritative posture (cf. 0014): clients never
-- write attribution directly — the rules live in the RPC, not in RLS.
-- ============================================================================

-- ---------- 1. who minted each challenge -------------------------------------
alter table public.challenges
  add column if not exists challenger_id uuid references public.profiles (id) on delete set null;

create index if not exists challenges_challenger_id_idx
  on public.challenges (challenger_id);

-- Keep minting permissive, but stop a client forging someone else's id: a
-- supplied challenger_id must be the caller's own. (null still allowed — the
-- logged-out preview path and pre-0015 links have no challenger.)
drop policy if exists "authenticated can create challenges" on public.challenges;
create policy "authenticated can create challenges"
  on public.challenges for insert to authenticated
  with check (challenger_id is null or challenger_id = auth.uid());

-- ---------- 2. who invited each player ---------------------------------------
alter table public.profiles
  add column if not exists invited_by uuid references public.profiles (id) on delete set null,
  add column if not exists invited_via_challenge text references public.challenges (id) on delete set null;

create index if not exists profiles_invited_by_idx
  on public.profiles (invited_by);

-- ---------- 3. record an accepted invite (idempotent, guarded) ---------------
-- The recipient's client calls this once after auth with the challenge id it
-- stashed from ?c=<id> (the id has to survive the OAuth redirect, which drops
-- the query string — see frontend/src/lib/challenge.ts). SECURITY DEFINER so it
-- can read challenger_id and write the profile edge, but every rule is enforced
-- here, never trusted from the client:
--   * unauthenticated         → ok:false 'unauthenticated'
--   * unknown / pre-0015 link → ok:false 'unknown_challenge' / 'no_challenger'
--   * your own link           → ok:false 'self'        (no self-referral)
--   * already attributed      → ok:true  already:true  (set-once)
--   * not a fresh signup      → ok:false 'not_new'     (don't credit existing players)
-- "New" = profile created within 24h, which is robust to the guest-plays-then-
-- signs-in ordering (created_at is stamped at signup by handle_new_user()).
create or replace function public.claim_referral(p_challenge_id text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user       uuid := auth.uid();
  v_challenger uuid;
  v_existing   uuid;
  v_created    timestamptz;
  v_name       text;
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

  -- set-once even under a concurrent double-claim (the invited_by guard).
  update public.profiles
  set invited_by = v_challenger,
      invited_via_challenge = p_challenge_id
  where id = v_user and invited_by is null;

  select display_name into v_name from public.profiles where id = v_challenger;

  return json_build_object(
    'ok', true, 'already', false,
    'inviter_name', coalesce(nullif(trim(v_name), ''), 'A Quorum player')
  );
end;
$$;

revoke all on function public.claim_referral(text) from public, anon, authenticated;
grant execute on function public.claim_referral(text) to authenticated;

-- ---------- 4. read model: my invite results --------------------------------
-- Powers "N friends joined" in the UI and (later) an inviter leaderboard.
--   invites_sent   = challenge links this player minted
--   friends_joined = new players attributed to this player
create or replace function public.get_my_referral_stats()
returns table (invites_sent int, friends_joined int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.challenges c where c.challenger_id = auth.uid())::int,
    (select count(*) from public.profiles  p where p.invited_by    = auth.uid())::int;
$$;

revoke all on function public.get_my_referral_stats() from public, anon;
grant execute on function public.get_my_referral_stats() to authenticated;

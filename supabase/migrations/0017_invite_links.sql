-- ============================================================================
-- Migration 0017 — personal invite links + founding-member status
--
-- 0015/0016 built attribution + rewards around *challenge* links (?c=<id>) — a
-- case-specific, post-play viral loop. This adds a second, identity-level invite
-- surface for the launch: every player gets ONE stable, reusable personal link
-- (?i=<code>). Arriving via someone's personal link and signing up makes you a
-- "founding member" — a badge plus a one-time welcome bonus — and attributes you
-- to the inviter so it also feeds the existing invite quest + referral stats.
--
-- There is NO access gate: anyone can still join organically (they simply aren't
-- founders). Exclusivity is the founder cohort, not a wall.
--
--   1. profiles.invite_code   → a short, url-safe, unique per-player code.
--   2. profiles.is_founder    → joined via a personal invite link.
--   3. gen_invite_code()      → collision-resistant code generator (no pgcrypto).
--   4. handle_new_user()      → now also mints an invite_code on signup.
--   5. claim_invite(code)     → SECURITY DEFINER RPC the recipient calls once
--      after signing up; guards mirror claim_referral (set-once / no-self /
--      new-signups-only) and grant the founder bonus + record attribution.
--   6. get_my_invite()        → read model for the Profile "invite a friend" card
--      (the caller's code, founder flag, and friends-joined count).
--
-- Server-authoritative like the rest of the project (cf. 0014/0015): clients
-- never write founder status or attribution directly — the rules live in the RPC.
-- ============================================================================

-- ---------- 1. columns -------------------------------------------------------
alter table public.profiles
  add column if not exists invite_code text,
  add column if not exists is_founder  boolean not null default false;

-- Unique, but many NULLs are allowed (Postgres treats NULLs as distinct), so the
-- column can be backfilled lazily without blocking the add.
create unique index if not exists profiles_invite_code_key
  on public.profiles (invite_code);

-- ---------- 2. code generator ------------------------------------------------
-- 8 chars from a 32-symbol alphabet (drops the ambiguous 0/O and 1/I) ≈ 1.1e12
-- space. Deliberately NOT cryptographic: invite codes are meant to be shared,
-- not kept secret — every privileged action behind them is guarded server-side.
-- Uses random() so it needs no pgcrypto extension; callers retry on a clash.
create or replace function public.gen_invite_code(p_len int default 8)
returns text language plpgsql volatile as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result   text := '';
  i        int;
begin
  for i in 1..p_len loop
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return result;
end;
$$;

-- ---------- 3. backfill existing players ------------------------------------
-- Per-row retry on the (astronomically rare) unique clash so the whole backfill
-- can't abort on one collision.
do $$
declare r record; v text;
begin
  for r in select id from public.profiles where invite_code is null loop
    loop
      begin
        v := public.gen_invite_code();
        update public.profiles set invite_code = v where id = r.id;
        exit;
      exception when unique_violation then
        -- code clash — try a fresh one
        null;
      end;
    end loop;
  end loop;
end $$;

-- ---------- 4. mint a code on signup ----------------------------------------
-- Supersedes the 0001 definition: same profile/progress seeding, but now also
-- assigns a unique invite_code, retrying on a code clash (and tolerating a
-- re-run for an already-seeded user).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  loop
    begin
      v_code := public.gen_invite_code();
      insert into public.profiles (id, display_name, avatar_color, invite_code)
      values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'You'),
        '#58CC02',
        v_code
      );
      exit;
    exception when unique_violation then
      -- Either a code clash (retry) or the profile already exists (done).
      if exists (select 1 from public.profiles where id = new.id) then exit; end if;
    end;
  end loop;

  insert into public.user_progress (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------- 5. claim a personal invite (founding member) --------------------
-- The recipient's client calls this once after auth with the code it stashed
-- from ?i=<code> (the code survives the OAuth redirect via localStorage, exactly
-- like the challenge id — see frontend/src/lib/invite.ts). Guards mirror
-- claim_referral:
--   * unauthenticated   → ok:false 'unauthenticated'
--   * unknown code      → ok:false 'unknown_code'
--   * your own code     → ok:false 'self'
--   * already a founder → ok:true  already:true   (set-once; no double bonus)
--   * not a fresh signup→ ok:false 'not_new'      (created > 24h ago)
-- On success it sets is_founder, records invited_by IF NOT ALREADY SET (so a
-- prior challenge attribution wins and we never overwrite it, while a pure
-- invite-link join still feeds the invite quest), and grants the welcome bonus
-- tied to the row we actually flipped (so a concurrent double-claim can't pay
-- twice). Returns the authoritative new total/level like claim_quest.
create or replace function public.claim_invite(p_code text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := auth.uid();
  v_inviter uuid;
  v_created timestamptz;
  v_founder boolean;
  v_name    text;
  v_bonus   int := 100;   -- one-time founding-member welcome XP
  v_updated int;
  v_total   int;
  v_level   int;
begin
  if v_user is null then
    return json_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    return json_build_object('ok', false, 'reason', 'no_code');
  end if;

  select id into v_inviter from public.profiles where invite_code = upper(trim(p_code));
  if not found then
    return json_build_object('ok', false, 'reason', 'unknown_code');
  end if;
  if v_inviter = v_user then
    return json_build_object('ok', false, 'reason', 'self');
  end if;

  select created_at, is_founder into v_created, v_founder
  from public.profiles where id = v_user;

  if v_founder then
    return json_build_object('ok', true, 'already', true);
  end if;
  if v_created is null or v_created < now() - interval '24 hours' then
    return json_build_object('ok', false, 'reason', 'not_new');
  end if;

  -- Become a founding member (set-once via the is_founder = false guard). Record
  -- attribution only if a challenge link hasn't already claimed it.
  update public.profiles
  set is_founder  = true,
      invited_by  = coalesce(invited_by, v_inviter)
  where id = v_user and is_founder = false;
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    update public.user_progress
    set total_xp   = total_xp + v_bonus,
        level      = greatest(1, floor((total_xp + v_bonus) / 500) + 1),
        updated_at = now()
    where user_id = v_user
    returning total_xp, level into v_total, v_level;
  else
    -- A concurrent claim won the race: grant nothing, report truth.
    v_bonus := 0;
    select total_xp, level into v_total, v_level
    from public.user_progress where user_id = v_user;
  end if;

  select display_name into v_name from public.profiles where id = v_inviter;

  return json_build_object(
    'ok', true, 'already', false, 'founder', true,
    'bonus_xp', v_bonus,
    'total_xp', coalesce(v_total, 0),
    'level', coalesce(v_level, 1),
    'inviter_name', coalesce(nullif(trim(v_name), ''), 'A Quorum player')
  );
end;
$$;

revoke all on function public.claim_invite(text) from public, anon, authenticated;
grant execute on function public.claim_invite(text) to authenticated;

-- ---------- 6. read model: my invite link -----------------------------------
-- Powers the Profile "invite a friend" card: the caller's code (minted lazily if
-- a pre-0017 profile still lacks one), whether they're a founder, and how many
-- players they've brought in.
create or replace function public.get_my_invite()
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := auth.uid();
  v_code   text;
  v_founder boolean;
  v_joined int;
begin
  if v_user is null then
    return json_build_object('ok', false);
  end if;

  select invite_code, is_founder into v_code, v_founder
  from public.profiles where id = v_user;

  if v_code is null then
    loop
      begin
        v_code := public.gen_invite_code();
        update public.profiles set invite_code = v_code where id = v_user;
        exit;
      exception when unique_violation then
        null;
      end;
    end loop;
  end if;

  select count(*) into v_joined from public.profiles where invited_by = v_user;

  return json_build_object(
    'ok', true,
    'code', v_code,
    'is_founder', coalesce(v_founder, false),
    'friends_joined', coalesce(v_joined, 0)
  );
end;
$$;

revoke all on function public.get_my_invite() from public, anon;
grant execute on function public.get_my_invite() to authenticated;

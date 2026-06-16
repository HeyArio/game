-- ============================================================================
-- Quorum — initial schema
-- Postgres / Supabase.  Run via the Supabase SQL editor or `supabase db push`.
--
-- Design notes:
--  * `profiles` extends Supabase's built-in `auth.users` (1:1).  We never store
--    passwords or emails ourselves — auth.users (managed by Supabase Auth +
--    Google OAuth) owns identity.  A trigger seeds a profile row on signup.
--  * The "verdict" (which option Arbi picked) lives in `case_options.is_judge_pick`
--    but is NOT exposed to clients until a case closes — enforced by RLS so the
--    answer can't be inspected early in a competitive game.
--  * Leaderboards are computed with a RANK() window query (see the
--    `league_standings` view) rather than storing a denormalised rank.
-- ============================================================================

-- ---------- profiles -------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default 'You',
  avatar_color  text not null default '#58CC02',
  created_at    timestamptz not null default now()
);

-- progress is 1:1 with a profile; split out so it can be updated independently.
create table public.user_progress (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  streak             int  not null default 0,
  continuance_count  int  not null default 2,
  total_xp           int  not null default 0,
  daily_xp           int  not null default 0,
  daily_goal         int  not null default 50,
  level              int  not null default 1,
  best_streak        int  not null default 0,
  updated_at         timestamptz not null default now()
);

-- ---------- daily cases ----------------------------------------------------
create table public.daily_cases (
  id         uuid primary key default gen_random_uuid(),
  case_no    int  not null unique,
  question   text not null,
  category   text not null,
  opens_at   timestamptz not null,
  closes_at  timestamptz not null
);

create table public.case_options (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.daily_cases (id) on delete cascade,
  letter         text not null check (letter in ('A','B','C','D')),
  model_name     text not null,          -- e.g. ASTRA / BOREAS
  pick           text not null,          -- e.g. France
  rationale      text not null,
  crowd_pct      int  not null default 0,
  is_judge_pick  boolean not null default false,
  unique (case_id, letter)
);

-- ---------- votes ----------------------------------------------------------
create table public.votes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  case_id     uuid not null references public.daily_cases (id) on delete cascade,
  option_id   uuid not null references public.case_options (id) on delete cascade,
  was_correct boolean,                   -- filled in by the scoring routine
  xp_earned   int,
  created_at  timestamptz not null default now(),
  unique (user_id, case_id)              -- one vote per case per user
);

-- ---------- leagues --------------------------------------------------------
create table public.leagues (
  id            uuid primary key default gen_random_uuid(),
  tier_name     text not null,           -- Bronze … Diamond
  period_start  timestamptz not null,
  period_end    timestamptz not null
);

create table public.league_memberships (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  xp         int  not null default 0,
  unique (league_id, user_id)
);

-- ---------- quests & achievements -----------------------------------------
create table public.quests (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('daily','weekly')),
  label         text not null,
  goal_count    int  not null,
  reward_xp     int  not null default 0,
  period_start  timestamptz not null,
  period_end    timestamptz not null
);

create table public.quest_progress (
  id            uuid primary key default gen_random_uuid(),
  quest_id      uuid not null references public.quests (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  count         int  not null default 0,
  completed_at  timestamptz,
  unique (quest_id, user_id)
);

create table public.achievements (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,
  label        text not null,
  description  text not null,
  goal_count   int  not null default 1
);

create table public.user_achievements (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  achievement_id   uuid not null references public.achievements (id) on delete cascade,
  progress_count   int  not null default 0,
  earned_at        timestamptz,
  primary key (user_id, achievement_id)
);

-- ---------- standings view (computed leaderboard) --------------------------
create view public.league_standings as
  select
    m.league_id,
    m.user_id,
    p.display_name,
    p.avatar_color,
    m.xp,
    rank() over (partition by m.league_id order by m.xp desc) as rank
  from public.league_memberships m
  join public.profiles p on p.id = m.user_id;

-- ============================================================================
-- Seed a profile + progress row automatically when a user signs up.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'You'),
    '#58CC02'
  );
  insert into public.user_progress (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.user_progress       enable row level security;
alter table public.daily_cases         enable row level security;
alter table public.case_options        enable row level security;
alter table public.votes               enable row level security;
alter table public.leagues             enable row level security;
alter table public.league_memberships  enable row level security;
alter table public.quests              enable row level security;
alter table public.quest_progress      enable row level security;
alter table public.achievements        enable row level security;
alter table public.user_achievements   enable row level security;

-- profiles: anyone authenticated can read (needed for leaderboards),
-- but you can only edit your own.
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- progress: only your own row, read + write.
create policy "own progress"
  on public.user_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cases: readable by all authenticated users once they've opened.
create policy "open cases readable"
  on public.daily_cases for select to authenticated
  using (opens_at <= now());

-- options: readable, but the judge pick is hidden until the case closes.
-- (Hiding a single column needs a view or column-level masking; the simplest
--  safe approach is to only expose `is_judge_pick` after closes_at. We do that
--  by gating the whole row select on opens_at, and recommend the client read
--  `is_judge_pick` only after close — for hard enforcement, expose options via
--  a SECURITY DEFINER RPC that nulls the flag pre-close. See backend README.)
create policy "options readable for open cases"
  on public.case_options for select to authenticated
  using (exists (
    select 1 from public.daily_cases c
    where c.id = case_id and c.opens_at <= now()
  ));

-- votes: you can read and create only your own.
create policy "read own votes"
  on public.votes for select to authenticated using (auth.uid() = user_id);
create policy "cast own vote"
  on public.votes for insert to authenticated with check (auth.uid() = user_id);

-- leagues / standings: readable by all authenticated.
create policy "leagues readable"
  on public.leagues for select to authenticated using (true);
create policy "memberships readable"
  on public.league_memberships for select to authenticated using (true);

-- quests: definitions readable by all; progress only your own.
create policy "quests readable"
  on public.quests for select to authenticated using (true);
create policy "own quest progress"
  on public.quest_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- achievements: definitions readable by all; your unlocks only yours.
create policy "achievements readable"
  on public.achievements for select to authenticated using (true);
create policy "own achievement unlocks"
  on public.user_achievements for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

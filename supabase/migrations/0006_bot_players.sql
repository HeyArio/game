-- ============================================================================
-- Migration 0006 — labeled AI opponents ("bots") for the leaderboard
--
-- Cold-start problem: an empty leaderboard kills retention. Rather than seed
-- fake *humans* (deceptive astroturfing), we add clearly-labeled AI opponents.
-- This is honest AND on-theme — Quorum is a game about AI models, so bot
-- players fit naturally. The frontend renders them with a 🤖 marker, and every
-- bot's display name ends in "-Bot", so no user is misled into thinking they're
-- competing against a person.
--
-- Bots live in their own table (they have no auth.users / profiles row) and are
-- UNIONed into global_leaderboard. A daily tick nudges their XP so the board
-- feels alive — but slowly enough that an engaged human can out-climb them.
-- ============================================================================

create table if not exists public.bot_players (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  avatar_color  text not null default '#9AA08C',
  total_xp      int  not null default 0,
  streak        int  not null default 0,
  daily_drift   int  not null default 35,   -- avg XP added per daily tick
  created_at    timestamptz not null default now()
);

alter table public.bot_players enable row level security;
drop policy if exists "bots readable" on public.bot_players;
create policy "bots readable" on public.bot_players
  for select to authenticated using (true);

-- ---------- leaderboard now unions real users + bots ------------------------
-- Drop first: the 0004 view exists with a different column list, and
-- CREATE OR REPLACE VIEW can't insert a new column (is_bot) mid-list.
drop view if exists public.global_leaderboard;
create or replace view public.global_leaderboard as
  with all_players as (
    select
      p.id          as user_id,
      p.display_name,
      p.avatar_color,
      up.total_xp,
      up.streak,
      greatest(1, floor(up.total_xp / 500) + 1)::int as level,
      false         as is_bot,
      up.updated_at as tiebreak
    from public.profiles p
    join public.user_progress up on up.user_id = p.id
    union all
    select
      b.id,
      b.display_name,
      b.avatar_color,
      b.total_xp,
      b.streak,
      greatest(1, floor(b.total_xp / 500) + 1)::int,
      true,
      b.created_at
    from public.bot_players b
  )
  select
    user_id, display_name, avatar_color, total_xp, streak, level, is_bot,
    rank() over (order by total_xp desc, tiebreak asc) as rank
  from all_players;

grant select on public.global_leaderboard to authenticated;

-- ---------- daily XP drift so the board keeps moving ------------------------
create or replace function public.tick_bot_xp()
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.bot_players
  set
    -- add roughly daily_drift XP, randomised +/- 50%, never negative
    total_xp = total_xp + greatest(0, (daily_drift * (0.5 + random()))::int),
    -- most bots keep their streak alive; a few "miss a day"
    streak   = case when random() < 0.88 then streak + 1 else greatest(0, streak - 1) end;
end;
$$;

-- Schedule daily (Supabase SQL editor, needs pg_cron):
--   select cron.schedule('tick-bot-xp', '10 0 * * *', $$ select public.tick_bot_xp(); $$);

-- ============================================================================
-- Seed a roster of model-themed bots with a spread of XP so the leaderboard
-- looks populated and competitive from day one. Adjust the count/spread freely.
-- ============================================================================
do $$
declare
  bot_names text[] := array[
    'Sonnet-Bot','Opus-Bot','Haiku-Bot','GPT-Bot','Turbo-Bot','Llama-Bot','Mistral-Bot',
    'Gemini-Bot','Flash-Bot','Grok-Bot','DeepSeek-Bot','Qwen-Bot','Phi-Bot','Nova-Bot',
    'Command-Bot','Mixtral-Bot','Falcon-Bot','Gemma-Bot','Yi-Bot','Cohere-Bot',
    'Vicuna-Bot','Orca-Bot','Pythia-Bot','Wizard-Bot','Hermes-Bot','Zephyr-Bot',
    'Solar-Bot','Aya-Bot','Jamba-Bot','Reka-Bot','Inflection-Bot','Pi-Bot',
    'Claude-Bot','Titan-Bot','Bedrock-Bot','Palm-Bot','Bard-Bot','Ada-Bot',
    'Babbage-Bot','Curie-Bot','Davinci-Bot','Stable-Bot','Dolphin-Bot','Samantha-Bot',
    'Nous-Bot','Airoboros-Bot','Guanaco-Bot','Alpaca-Bot','Koala-Bot','Mytho-Bot',
    'Capybara-Bot','Starling-Bot','Tulu-Bot','Openchat-Bot','Neural-Bot','Synthia-Bot',
    'Goliath-Bot','Platypus-Bot','Saiga-Bot','Marcoroni-Bot'
  ];
  colors text[] := array[
    '#58CC02','#1CB0F6','#FF4B4B','#FF9600','#CE82FF',
    '#00CD9C','#FF86D0','#FFC800','#4C97FF','#F7C948'
  ];
  n     int;
  xp    int;
begin
  -- Only seed once.
  if (select count(*) from public.bot_players) > 0 then return; end if;

  for n in 1 .. array_length(bot_names, 1) loop
    -- Spread XP from ~200 up to ~5200 with some noise so ranks feel organic.
    xp := (200 + (n * 80) + floor(random() * 600))::int;
    insert into public.bot_players (display_name, avatar_color, total_xp, streak, daily_drift)
    values (
      bot_names[n],
      colors[1 + floor(random() * array_length(colors, 1))::int],
      xp,
      floor(random() * 45)::int,
      20 + floor(random() * 35)::int
    );
  end loop;
end;
$$;

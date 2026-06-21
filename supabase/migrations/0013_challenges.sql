-- ============================================================================
-- Quorum — challenge links ("nobody gets a link, everybody gets a challenge")
--
-- A challenge is a shareable "I dare you to out-judge Arbi" link. When a player
-- finishes today's case they can mint one; the recipient lands on today's case
-- with a "X challenged you" intro and, after voting, a You-vs-X-vs-Arbi reveal.
--
-- SPOILER-FREE BY DESIGN: a challenge stores the challenger's *pick* (an
-- opinion, like sharing your Wordle guess) but NEVER the verdict — no
-- `was_correct`, no judge pick. Nothing here can reveal the answer to a
-- recipient who hasn't played yet, even while the case is still open. This is
-- the same secrecy guarantee the rest of the schema enforces on
-- `case_options.is_judge_pick`.
-- ============================================================================

create table public.challenges (
  id              text primary key,                                  -- short url-safe slug (client-generated)
  case_id         uuid references public.daily_cases (id) on delete set null,
  case_no         int,                                               -- denormalised so the link works after the case row rotates
  question        text not null,                                     -- denormalised for the OG preview + recipient intro
  category        text,
  challenger_name text not null default 'A Quorum player',
  challenger_pick text check (challenger_pick in ('a','b','c','d')), -- letter only; an opinion, not the verdict
  confidence      text check (confidence in ('low','med','high')),
  card_url        text,                                              -- public Storage URL of the 1200x630 preview card
  created_at      timestamptz not null default now()
);

create index challenges_created_at_idx on public.challenges (created_at desc);

alter table public.challenges enable row level security;

-- Public read: a logged-out recipient must be able to see "X challenged you"
-- before signing in. There is nothing secret on the row to protect.
create policy "challenges are publicly readable"
  on public.challenges for select to anon, authenticated using (true);

-- Signed-in players mint challenges after they've played. No verdict columns
-- exist to leak, so a permissive insert check is safe.
create policy "authenticated can create challenges"
  on public.challenges for insert to authenticated with check (true);

-- ---------- Storage bucket for the generated OG cards -----------------------
-- The challenger's browser renders the 1200x630 preview (reusing the result-
-- card canvas code) and uploads it here; the edge function points og:image at
-- the public URL. A public bucket so social crawlers can fetch the image.
insert into storage.buckets (id, name, public)
values ('challenge-cards', 'challenge-cards', true)
on conflict (id) do nothing;

create policy "challenge cards are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'challenge-cards');

create policy "authenticated can upload challenge cards"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'challenge-cards');

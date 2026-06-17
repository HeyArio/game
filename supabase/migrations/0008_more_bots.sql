-- ============================================================================
-- Migration 0008 — scale up the labeled AI opponent pool (~2000 more)
--
-- Adds depth to the leaderboard so ranks feel real and a new player isn't
-- stuck alone at the bottom. These are still clearly-labeled AI players, NOT
-- fake humans: every name is a synthetic AI handle ending in "-Bot", and the
-- frontend marks them with 🤖. (See 0006 for the rationale — we deliberately
-- avoid astroturfing with fake human accounts.)
--
-- XP is skewed (power curve): lots of low-XP bots, few high-XP ones, like a
-- real player base. They drift daily via the existing tick_bot_xp().
-- ============================================================================

do $$
declare
  prefixes text[] := array[
    'Quantum','Neural','Vector','Logic','Cortex','Synapse','Cipher','Nimbus','Photon','Tensor',
    'Lambda','Sigma','Delta','Omega','Pixel','Echo','Aether','Binary','Cosmic','Fractal',
    'Helix','Ion','Kappa','Lumen','Matrix','Nova','Orbit','Prism','Quasar','Rune',
    'Spark','Titan','Ultra','Volt','Warp','Xeno','Zen','Apex','Byte','Flux',
    'Glyph','Hex','Jet','Onyx','Polar','Riff','Solar','Terra','Vapor','Wisp'
  ];
  cores text[] := array[
    'Mind','Core','Net','Wave','Brain','Node','Loop','Forge','Pulse','Sage',
    'Oracle','Scribe','Judge','Seer','Pilot','Scout','Lens','Quill','Atlas','Drift',
    'Spire','Vault','Beam','Crux','Dash','Edge','Grid','Halo'
  ];
  colors text[] := array[
    '#58CC02','#1CB0F6','#FF4B4B','#FF9600','#CE82FF',
    '#00CD9C','#FF86D0','#FFC800','#4C97FF','#F7C948'
  ];
  n  int;
  xp int;
begin
  -- Guard: only run the big batch once (0006 seeds ~60, so count starts small).
  if (select count(*) from public.bot_players) > 500 then return; end if;

  for n in 1 .. 2000 loop
    -- Power curve: square-ish of random() pushes most bots toward lower XP.
    xp := floor(power(random(), 2.2) * 6000)::int;
    insert into public.bot_players (display_name, avatar_color, total_xp, streak, daily_drift)
    values (
      prefixes[1 + floor(random() * array_length(prefixes, 1))::int]
        || cores[1 + floor(random() * array_length(cores, 1))::int] || '-Bot',
      colors[1 + floor(random() * array_length(colors, 1))::int],
      xp,
      floor(random() * 40)::int,
      8 + floor(random() * 28)::int
    );
  end loop;
end;
$$;

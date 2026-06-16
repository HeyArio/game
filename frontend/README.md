# Quorum — Daily Case (frontend)

A Vite + React + TypeScript port of the "Quorum" daily-case voting game mockup
(originally a single-file `.dc.html` design prototype). No backend, no auth,
no router — a single page with internal screen state (Play / Leagues / Quests
/ Profile) plus two modal overlays and confetti.

## Install

```bash
npm install
```

## Develop

```bash
npm run dev
```

Starts the Vite dev server (default http://localhost:5173).

## Build

```bash
npm run build
```

Type-checks with `tsc -b` then produces a static, deployable `dist/` via
`vite build`. Preview the production build locally with:

```bash
npm run preview
```

## Structure

- `src/icons/Icon.tsx` — icon set + `<Icon />` component (ported from the
  original `ICONS` map / `icon()` helper).
- `src/components/Mascot.tsx` — "Arbi" mascot SVG (neutral / happy / soft moods).
- `src/components/` — shared UI: top nav bar, answer card, confetti canvas,
  streak overlay, league-promotion overlay.
- `src/state/useGameState.ts` — the game state machine as a React hook
  (voting phases, reveal sequencing, scoring, XP/streak/quest updates,
  countdown timer, confetti).
- `src/state/viewHelpers.tsx` — pure functions that derive per-screen view
  data (cards, league rows, quests, profile, etc.) from game state.
- `src/pages/` — one file per screen (`PlayPage`, `LeaguesPage`,
  `QuestsPage`, `ProfilePage`).
- `src/App.tsx` — screen switch, overlays, and the fixed confetti canvas.

# Quorum → Nazarban bridge

How players who come to play **Quorum** (quorumdaily.com) are led toward the
parent studio, **Nazarban** (nazarbanai.com).

**Goal:** lead generation for Nazarban's CRM and lead engine for skin-care clinics
(it takes Instagram leads to real clinic customers). Soft and honest, never a hard sell;
the daily case stays the hero.
**Audience:** players are a general audience; clinic owners are the target. The game opens
the conversation, so distribution to clinics (stories, LinkedIn, DMs) matters as much as the
in-game links. See `clinic-leads-playbook.md`.

---

## What's live in the game (this repo)

All touchpoints are UTM-tagged via `frontend/src/lib/nazarban.ts`
(`utm_source=quorum`, `utm_campaign=clinic_leads`, per-surface `utm_medium`) so each
can be measured independently. Links land on the home page until `CLINIC_LANDING_PATH`
in that file is set to the clinic page (e.g. `"/clinics"`).

| Surface | File | `utm_medium` | Notes |
| --- | --- | --- | --- |
| App footer | `src/App.tsx` | `app_footer` | "Run a skin clinic? See how Nazarban takes Instagram leads to real customers →" |
| Landing footer | `src/pages/LandingPage.tsx` | `landing_footer` | Same line as the app footer |
| Post-game card | `src/pages/PlayPage.tsx` (`NazarbanCard`) | `postgame_card` | "Run a skin clinic?" card, shown only after the case is done so it never competes with the daily ritual |
| Share image | `src/lib/shareCard.ts` | — (image stamp) | Every shared result card carries "Nazarban · CRM for skin clinics · nazarbanai.com", so shares reach clinic owners among non-players |
| Challenge image | `src/lib/challenge.ts` | — (image) | Shares now attach the Arbi card image, not just a URL |

**Design rule:** the daily case is the hero. The only *interruptive* surface is
the post-game card, and it appears strictly after the verdict. Nothing is added
before lock-in.

---

## What to build on the Nazarban side: a clinic landing page

> **Update:** the target is now a clinic page (copy in `clinic-leads-playbook.md`), not the
> product chooser below, which is kept for reference only.

A dedicated landing page so cross-over traffic lands somewhere that acknowledges
where they came from — not a cold generic homepage.

### Page spec

1. **Hero** — speak to what they just did:
   > "You just out-judged four frontier AIs. Here's what else we build at Nazarban."
   Keep Quorum's visual language (green, rounded, the Arbi mascot) for continuity
   so the trust carries across.

2. **Product chooser** — because the audience overlap is unknown, present each
   Nazarban product as a distinct, self-select card (Quorum, SellerClaw, the AI
   chatbot, …). Let the visitor pick; don't pick for them.

3. **One soft email capture** — "Get notified when we ship something new." Low
   commitment; fits the awareness goal without a hard product ask.

### Measurement (turns "unsure about overlap" into data)

- Read the `utm_medium` so you know which in-game surface converts best.
- **Track each product card's click separately** (distinct outbound URL or
  click event). Within a couple of weeks the traffic itself reveals *which*
  Nazarban product Quorum's audience gravitates to — answering the open
  audience-overlap question with behaviour instead of a guess.
- North-star for this phase: click-through to `/from-quorum`, then card-click
  rate per product.

---

## Next ideas (not yet built)

- **One-time Arbi "discover Nazarban" moment** after a milestone (first win /
  3-day streak), reusing the `PromoOverlay.tsx` celebration pattern so it feels
  earned, not spammy.
- **"Ask Nazarban about today's case"** deep link from the verdict into the AI
  chatbot, pre-loaded with the day's question — a *native* bridge, worth doing
  if/when the chatbot is the consumer-facing product.

# Arbi — Character Kit

Animation-ready vector assets for **Arbi**, Quorum's AI-judge mascot.

## Files
| File | What it is |
|------|------------|
| `character-sheet.html` | Open in a browser. Full design sheet: live animated preview, 4 expressions, turnaround, palette, and the rigging guide. **Start here.** |
| `arbi-full.svg` | Full-body figure. Layered — every animatable part is a named `<g id>`. |
| `arbi-head.svg` | Head-only module (neutral). Best for talking-head / reaction shots. |

## Quick start (any animation tool)
1. Open `arbi-full.svg` in **Figma** or **Illustrator** — the layer/group names come through intact.
2. Animate the named groups (see pivots below).
3. Export:
   - **Lottie** (web/app, tiny): Figma → *LottieFiles* plugin, or AE → *Bodymovin*.
   - **Rive**: import the SVG, rig the same groups.
   - **MP4/GIF**: After Effects or any SVG-to-video tool.
   - **Pure web**: the `<style>` block in `character-sheet.html` is a working CSS idle loop you can lift.

## Layers & suggested pivots
| Layer (`id`) | Motion | Pivot |
|---|---|---|
| `arbi-body-rig` | float bob, translateY ±4px | 110,140 |
| `arbi-glow` | antenna pulse, opacity 0.35→1 | 110,13 |
| `arbi-eye-left` / `arbi-eye-right` | blink, scaleY→0.08 | 96,90 / 124,90 |
| `arbi-mouth` | talk / smile (morph `d`) | — |
| `arbi-head` | tilt, rotate ±8° | 110,92 |
| `arbi-arm-right` | raise / swing | 142,150 |
| `arbi-gavel` | verdict tap, rotate -25°→0 | 170,125 |
| `arbi-arm-left` | wave / gesture | 78,150 |
| `arbi-cheek-*` | blush fade on "happy" | — |

## Expressions
Neutral · Happy (correct match) · Thinking (deliberating) · Soft (verdict).
Swap the contents of `#arbi-face`, or morph eyes + mouth between states. The exact
shapes for each mood are in `character-sheet.html` and mirror the in-app
`Mascot.tsx` moods so on-screen and animated Arbi stay consistent.

## Palette (locked to brand tokens)
`#58CC02` body · `#4FBE00` shade · `#46A302` accent · `#7BE021` glow ·
`#ECFCDD` screen · `#2E6B00` ink · `#FF8FA3` blush · `#C68A3E` gavel wood

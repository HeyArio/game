// Quorum → Nazarban bridge links, in one place so every touchpoint is
// (a) worded consistently and (b) measurable. The goal here is brand awareness
// and traffic — soft "see what else we build" links, never a hard sell — so the
// copy stays light and every link is UTM-tagged to show how much of Quorum's
// audience actually crosses over (and, on the Nazarban side, which product they
// gravitate to).

const BASE = "https://nazarbanai.com";

/**
 * A UTM-tagged link to Nazarban. `medium` identifies the in-game surface
 * (e.g. "app_footer", "postgame_card") so each placement can be measured
 * independently in analytics.
 */
export function nazarbanUrl(medium: string): string {
  const p = new URLSearchParams({
    utm_source: "quorum",
    utm_medium: medium,
    utm_campaign: "bridge",
  });
  return `${BASE}/?${p.toString()}`;
}

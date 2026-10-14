// Quorum → Nazarban bridge links, in one place so every touchpoint is
// (a) worded consistently and (b) measurable. The goal is lead generation for
// Nazarban's CRM and lead engine for skin-care clinics (it takes Instagram leads
// to real clinic customers), so the copy speaks to clinic owners and every link is
// UTM-tagged to show which in-game surface sends the most of them.

const BASE = "https://nazarbanai.com";

/**
 * Where clinic leads land. Leave empty to send them to the home page; set it to
 * the dedicated clinic page (e.g. "/clinics") once that page is live, and every
 * in-game link follows, so no other file needs to change.
 */
const CLINIC_LANDING_PATH = "";

/** The one-line description used wherever the game explains what Nazarban builds. */
export const NAZARBAN_PITCH = "a CRM and lead engine that takes Instagram leads to real clinic customers";

/**
 * A UTM-tagged link to Nazarban. `medium` identifies the in-game surface
 * (e.g. "app_footer", "postgame_card") so each placement can be measured
 * independently in analytics.
 */
export function nazarbanUrl(medium: string): string {
  const p = new URLSearchParams({
    utm_source: "quorum",
    utm_medium: medium,
    utm_campaign: "clinic_leads",
  });
  return `${BASE}${CLINIC_LANDING_PATH || "/"}?${p.toString()}`;
}

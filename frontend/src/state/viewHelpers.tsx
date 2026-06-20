import type { CSSProperties } from "react";
import { Icon, icon } from "../icons/Icon";
import type { BaseCard, CardId, GameState, LeaguePlayer, PlayerStats, QuestStateRow } from "./types";
import { CROWD_LEADER, JUDGE_ID, baseCards as _baseCards } from "./useGameState";

function baseCards(s?: GameState) { return s?.cards?.length ? s.cards : _baseCards(); }
function judgeId(s?: GameState): string { return s?.judgeCardId ?? JUDGE_ID; }

export const COLORS: Record<string, string> = { A: "#58CC02", B: "#1CB0F6", C: "#CE82FF", D: "#FF9600" };

export function shade(hex: string): string {
  return (
    ({ "#58CC02": "#46A302", "#1CB0F6": "#1899D6", "#CE82FF": "#A95FE0", "#FF9600": "#E07F00" } as Record<string, string>)[hex] ||
    "#999"
  );
}

// XP-banded league tiers. The player's tier is derived from their real total XP
// so "Emerald" et al. reflect actual standing — and the Profile badge and the
// Leagues ladder stay in sync with one source of truth.
export const LEAGUE_TIERS: { name: string; min: number; icon: string; color: string }[] = [
  { name: "Bronze",   min: 0,     icon: "shield", color: "#CD7F32" },
  { name: "Silver",   min: 1000,  icon: "shield", color: "#9AA6B2" },
  { name: "Gold",     min: 2500,  icon: "shield", color: "#E6A700" },
  { name: "Sapphire", min: 5000,  icon: "shield", color: "#1CB0F6" },
  { name: "Emerald",  min: 10000, icon: "trophy", color: "#58CC02" },
  { name: "Ruby",     min: 20000, icon: "crown",  color: "#FF4B4B" },
  { name: "Diamond",  min: 40000, icon: "gem",    color: "#7DD3FC" },
];

export function leagueTierIndex(totalXp: number): number {
  let idx = 0;
  for (let i = 0; i < LEAGUE_TIERS.length; i++) if (totalXp >= LEAGUE_TIERS[i].min) idx = i;
  return idx;
}

export function leagueTierName(totalXp: number): string {
  return LEAGUE_TIERS[leagueTierIndex(totalXp)].name;
}

export function leagueTier(totalXp: number): { name: string; min: number; icon: string; color: string } {
  return LEAGUE_TIERS[leagueTierIndex(totalXp)];
}

export function cardStyle(c: BaseCard, s: GameState): CSSProperties {
  const sel = s.selected === c.id;
  // The winner highlight must follow the *real* judge pick the server revealed
  // (judgeCardId), not a hardcoded card — otherwise the green "Arbi's pick"
  // styling lands on the wrong card whenever the judge didn't pick D.
  const isJ = c.id === judgeId(s);
  let bg = "#fff";
  let border = "#E4EAD8";
  let lip = "#E4EAD8";
  if (sel && s.phase === "unvoted") {
    bg = "#DDF4FF";
    border = "#1CB0F6";
    lip = "#1899D6";
  }
  if (s.reveal.judge && isJ) {
    bg = "#E8FFD7";
    border = "#58CC02";
    lip = "#4BA802";
  } else if (s.reveal.judge && sel) {
    bg = "#FFF3E0";
    border = "#FFB74D";
    lip = "#F57C00";
  }
  return {
    display: "flex",
    flexDirection: "column",
    minHeight: "200px",
    padding: "18px",
    borderRadius: "18px",
    background: bg,
    border: `2px solid ${border}`,
    borderBottomWidth: "4px",
    borderBottomColor: lip,
    cursor: s.phase === "unvoted" ? "pointer" : "default",
    transition: "background .18s,border-color .18s,transform .12s",
    transform: sel && s.phase === "unvoted" ? "translateY(-2px)" : "none",
  };
}

export function badgeStyle(c: BaseCard): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    flex: "none",
    background: COLORS[c.letter],
    color: "#fff",
    fontFamily: "'Baloo 2',cursive",
    fontWeight: 800,
    fontSize: "19px",
    boxShadow: `0 3px 0 ${shade(COLORS[c.letter])}`,
  };
}

export function lockStyle(s: GameState): CSSProperties {
  const r = !!s.selected;
  return {
    width: "100%",
    border: "none",
    cursor: r ? "pointer" : "not-allowed",
    padding: "17px",
    borderRadius: "16px",
    fontFamily: "'Nunito',sans-serif",
    fontWeight: 800,
    fontSize: "17px",
    letterSpacing: ".04em",
    textTransform: "uppercase",
    color: r ? "#fff" : "#AFB4A4",
    background: r ? "#58CC02" : "#E4EAD8",
    boxShadow: r ? "0 4px 0 #46A302" : "0 4px 0 #D2D8C6",
    transition: "transform .05s, box-shadow .05s",
  };
}

export function lockActiveStyle(s: GameState): CSSProperties {
  return s.selected ? { transform: "translateY(3px)", boxShadow: "0 1px 0 #46A302" } : {};
}

export function continueStyle(s: GameState): CSSProperties {
  const c = s.win ? "#58CC02" : "#FF9600";
  const d = s.win ? "#46A302" : "#E07F00";
  return {
    border: "none",
    cursor: "pointer",
    padding: "13px 26px",
    borderRadius: "14px",
    fontFamily: "'Nunito',sans-serif",
    fontWeight: 800,
    fontSize: "15px",
    letterSpacing: ".04em",
    color: "#fff",
    background: c,
    boxShadow: `0 4px 0 ${d}`,
    transition: "transform .05s, box-shadow .05s",
  };
}

export function continueActiveStyle(s: GameState): CSSProperties {
  const d = s.win ? "#46A302" : "#E07F00";
  return { transform: "translateY(3px)", boxShadow: `0 1px 0 ${d}` };
}

export interface NavItemView {
  id: string;
  label: string;
  active: boolean;
  iconEl: JSX.Element | null;
  style: CSSProperties;
}

export function navView(screen: string): NavItemView[] {
  const items = [
    { id: "play", label: "Play", icon: "play" },
    { id: "leagues", label: "Leagues", icon: "trophy" },
    { id: "quests", label: "Quests", icon: "target" },
    { id: "profile", label: "Profile", icon: "user" },
  ];
  return items.map((it) => {
    const active = screen === it.id;
    return {
      id: it.id,
      label: it.label,
      active,
      iconEl: icon(it.icon, 19, active ? "#58A700" : "#6E7764"),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 13px",
        borderRadius: "13px",
        cursor: "pointer",
        background: active ? "#E8FFD7" : "transparent",
        color: active ? "#58A700" : "#6E7764",
        fontWeight: active ? 800 : 700,
        fontSize: "14px",
        transition: "background .15s, color .15s",
      },
    };
  });
}

export interface ViewCard extends BaseCard {
  modelLabel: string;
  accent: string;
  selected: boolean;
  style: CSSProperties;
  badgeStyle: CSSProperties;
  showId: boolean;
  idColor: string;
  showArbiter: boolean;
  arbiterTag: string;
  showWrong: boolean;
  showBars: boolean;
  barColor: string;
  crowdTag: string;
  pctLabel: string;
  barWidth: string;
}

export function viewCards(s: GameState): ViewCard[] {
  const jId = judgeId(s);
  // The crowd favourite is whatever the server revealed (falls back to the
  // seeded leader only in the offline/dev path) — never a hardcoded card.
  const crowdLeader = s.crowdLeaderId ?? CROWD_LEADER;
  return baseCards(s).map((c) => {
    const isJ = c.id === jId;
    const sel = s.selected === c.id;
    const barColor =
      s.reveal.judge && isJ ? "#58CC02" : s.reveal.judge && sel ? "#F57C00" : c.id === crowdLeader ? "#1CB0F6" : "#BFC5B2";
    return {
      ...c,
      modelLabel: "MODEL " + c.letter,
      accent: COLORS[c.letter],
      selected: sel,
      style: cardStyle(c, s),
      badgeStyle: badgeStyle(c),
      showId: s.reveal.ids,
      idColor: s.reveal.judge && isJ ? "#58A700" : "#74796B",
      showArbiter: !!(s.reveal.judge && isJ),
      arbiterTag: s.reveal.judge && isJ && sel ? "MY PICK · SNAP!" : "MY PICK",
      showWrong: !!(s.reveal.judge && sel && !isJ),
      showBars: s.reveal.bars,
      barColor,
      crowdTag: c.id === crowdLeader ? " · TOP" : "",
      pctLabel: Math.round((s.displayPct as any)[c.id]) + "%",
      barWidth: (s.displayPct as any)[c.id] + "%",
    };
  });
}

export interface WeekDayView {
  letter: string;
  iconEl: JSX.Element | null;
  style: CSSProperties;
}

export function weekDaysView(s: GameState): WeekDayView[] {
  const todayIdx = new Date().getDay(); // 0=Sun … 6=Sat
  return ["S", "M", "T", "W", "T", "F", "S"].map((letter, i) => {
    const st = i < todayIdx ? "done" : i === todayIdx ? (s.scored ? "done" : "today") : "future";
    const base: CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "30px",
      height: "30px",
      borderRadius: "50%",
    };
    if (st === "done") return { letter, iconEl: icon("check", 17, "#fff", 2.8), style: { ...base, background: "#58CC02" } };
    if (st === "today")
      return { letter, iconEl: icon("bolt", 16, "#FF9600"), style: { ...base, background: "#FFF3E0", border: "2px solid #FF9600" } };
    return { letter, iconEl: icon("lock", 14, "#C2C7B6"), style: { ...base, background: "#F0F2EA" } };
  });
}

export interface LeagueRowView {
  rank: number;
  name: string;
  initial: string;
  color: string;
  xp: string;
  isYou?: boolean;
  isBot?: boolean;
  promoLineBefore: boolean;
  rankColor: string;
  style: CSSProperties;
}

export function leagueRowsView(s: GameState): LeagueRowView[] {
  const ranked = s.league.map((p, i) => ({ ...p, rank: i + 1 }));
  return ranked.slice(0, 5).map((p) => ({
    rank: p.rank,
    name: p.name,
    initial: p.initial,
    color: p.color,
    xp: p.xp.toLocaleString(),
    isYou: p.isYou,
    isBot: p.isBot,
    promoLineBefore: false,
    rankColor: p.rank <= 5 ? "#58A700" : "#B2B7A6",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "7px 9px",
      borderRadius: "11px",
      background: p.isYou ? "#E8FFD7" : "transparent",
      outline: p.isYou ? "2px solid #A5ED6E" : "none",
    },
  }));
}

export interface BadgeView {
  iconEl: JSX.Element | null;
  label: string;
  iconWrap: CSSProperties;
  labelColor: string;
  showCount: boolean;
  count?: string;
  ring?: string;
}

function bw(bg: string): CSSProperties {
  return {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    background: bg,
  };
}

// Play-rail achievements, all measured against the player's *real* lifetime
// stats so the widget reflects actual progress (and stays consistent with the
// Profile page) instead of showing decorative always-earned / always-locked
// tiles. `mk` tints + colours the tile when earned and greys it when locked.
export function badgesView(s: GameState, st: PlayerStats): BadgeView[] {
  const mk = (earned: boolean, iconName: string, tint: string, tintBg: string, label: string, count?: string): BadgeView => ({
    iconEl: icon(iconName, 25, earned ? tint : "#C2C7B6"),
    label,
    iconWrap: bw(earned ? tintBg : "#F0F2EA"),
    labelColor: earned ? "#3C3C46" : "#B2B7A6",
    showCount: count != null,
    count,
    ring: earned ? tint : "#C2C7B6",
  });
  return [
    mk(st.casesJudged >= 10, "medal", "#58CC02", "#E8FFD7", "Apprentice"),
    mk(st.casesJudged >= 50, "cap", "#1CB0F6", "#E3F6FF", "Scholar"),
    mk(s.streak >= 14, "flame", "#FF9600", "#FFF3E0", "On Fire", String(s.streak)),
    mk(st.correctCount >= 10, "eye", "#CE82FF", "#F6ECFF", "Sharp Eye", `${Math.min(st.correctCount, 10)}/10`),
    mk(st.correctCount >= 50, "scale", "#58A700", "#E8FFD7", "Sage"),
    mk(st.casesJudged >= 20 && st.agreementPct >= 60, "target", "#E5A300", "#FFF8E1", "Marksman"),
  ];
}

function rc(bg: string, col: string): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "999px", background: bg, color: col, fontWeight: 800, fontSize: "12px" };
}

export interface RewardChip {
  iconEl: JSX.Element | null;
  label: string;
  style: CSSProperties;
}

export function rewardChipsView(s: GameState): RewardChip[] {
  const your = baseCards(s).find((c) => c.id === s.selected);
  const chips: RewardChip[] = [];
  if (s.win) {
    chips.push({ iconEl: icon("flame", 16, "#FF9600"), label: "Streak → " + s.streak, style: rc("#FFF3E0", "#FF9600") });
    chips.push({ iconEl: icon("eye", 16, "#A95FE0"), label: "Sharp Eye " + s.sharpEye + "/" + s.sharpEyeGoal, style: rc("#F6ECFF", "#A95FE0") });
    if (s.promoted) chips.push({ iconEl: icon("trendUp", 16, "#58A700"), label: "Promotion zone!", style: rc("#E8FFD7", "#58A700") });
  } else {
    chips.push({ iconEl: icon("flame", 16, "#FF9600"), label: "Streak → " + s.streak, style: rc("#FFF3E0", "#FF9600") });
    chips.push({ iconEl: icon("users", 16, "#1899D6"), label: (your ? your.crowd : 0) + "% voted with you", style: rc("#E3F6FF", "#1899D6") });
  }
  return chips;
}

export interface DoneChip {
  iconEl: JSX.Element | null;
  label: string;
  style: CSSProperties;
}

export interface DoneView {
  arbiMood: "happy" | "neutral";
  chips: DoneChip[];
  note: string;
}

export function doneView(s: GameState): DoneView {
  const your = baseCards(s).find((c) => c.id === s.selected);
  const chips: DoneChip[] = [
    { iconEl: icon("bolt", 16, "#E5A300"), label: "+" + s.earned + " XP", style: rc("#FFF8E1", "#E5A300") },
    { iconEl: icon("flame", 16, "#FF9600"), label: "Streak " + s.streak, style: rc("#FFF3E0", "#FF9600") },
    s.win
      ? { iconEl: icon("scale", 16, "#58A700"), label: "Matched my verdict", style: rc("#E8FFD7", "#58A700") }
      : { iconEl: icon("users", 16, "#1899D6"), label: (your ? your.crowd : 0) + "% with you", style: rc("#E3F6FF", "#1899D6") },
  ];
  const note = s.win
    ? "Sharp read today. Rest the gavel — I'll have a trickier one waiting tomorrow."
    : "Close call, and you argued it well. Sleep on it; tomorrow's docket is a fresh slate.";
  return { arbiMood: s.win ? "happy" : "neutral", chips, note };
}

export interface LeaguesView {
  tiers: { name: string; labelColor: string; iconEl: JSX.Element | null; badgeStyle: CSSProperties }[];
  rows: {
    rankLabel: string;
    name: string;
    initial: string;
    color: string;
    xp: string;
    isYou?: boolean;
    isBot?: boolean;
    rankColor: string;
    promoLineBefore: boolean;
    demoLineBefore: boolean;
    style: CSSProperties;
  }[];
  youRank: number;
  note: string;
  bigTrophyEl: JSX.Element | null;
  promoIconEl: JSX.Element | null;
}

export function leaguesView(s: GameState): LeaguesView {
  const ranked = s.league.map((p, i) => ({ ...p, rank: i + 1 }));
  // Prefer the real global rank; fall back to the position within the loaded board.
  const youRank = s.globalRank ?? (ranked.find((p) => p.isYou) || ({} as LeaguePlayer & { rank: number })).rank ?? ranked.length + 1;
  // Current tier comes from the player's real total XP; everything below it is
  // earned, everything above is locked.
  const curIdx = leagueTierIndex(s.totalXp);
  const tiers = LEAGUE_TIERS.map((t, i) => {
    const current = i === curIdx;
    const locked = i > curIdx;
    return {
      name: t.name,
      labelColor: current ? "#58A700" : locked ? "#C2C7B6" : "#7C8470",
      iconEl: icon(t.icon, 24, locked ? "#C7CCBC" : "#fff"),
      badgeStyle: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "50px",
        height: "50px",
        borderRadius: "16px",
        flex: "none",
        background: locked ? "#F0F2EA" : t.color,
        boxShadow: current ? "0 0 0 4px #DDF4C9, 0 3px 0 #3E9000" : "none",
      } as CSSProperties,
    };
  });
  const rows = ranked.map((p) => ({
    rankLabel: String(p.rank),
    name: p.isYou ? "You" : p.name,
    initial: p.initial,
    color: p.color,
    xp: p.xp.toLocaleString() + " XP",
    isYou: p.isYou,
    isBot: p.isBot,
    rankColor: p.rank === 1 ? "#E6A700" : p.rank <= 3 ? "#58A700" : "#B2B7A6",
    promoLineBefore: false,
    demoLineBefore: false,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "11px 12px",
      borderRadius: "13px",
      background: p.isYou ? "#E8FFD7" : "transparent",
      outline: p.isYou ? "2px solid #A5ED6E" : "none",
    } as CSSProperties,
  }));
  const note =
    youRank <= 10
      ? "Top " + youRank + " across every player — sharp work. Judge a case every day and you'll hold it."
      : "You're ranked #" + youRank.toLocaleString() + " overall. Win a few more cases with me and you'll climb fast.";
  return { tiers, rows, youRank, note, bigTrophyEl: icon("trophy", 34, "#fff"), promoIconEl: icon("trendUp", 13, "#58A700") };
}

export interface QuestItemView {
  questKey: string;
  iconEl: JSX.Element | null;
  iconWrap: CSSProperties;
  label: string;
  countLabel: string;
  countColor: string;
  barWidth: string;
  barColor: string;
  rewardLabel: string;
  claimable: boolean;
  claimed: boolean;
  cardBg: string;
  cardBorder: string;
}

export interface QuestBigView {
  questKey: string;
  iconEl: JSX.Element | null;
  label: string;
  sub: string;
  count: string;
  goalLabel: string;
  barWidth: string;
  rewardLabel: string;
  claimable: boolean;
  claimed: boolean;
  gradient: string;
  shadow: string;
}

export interface QuestsView {
  clockEl: JSX.Element | null;
  refresh: string;
  daily: QuestItemView[];
  big: QuestBigView[];
}

// Per-quest visual identity, keyed by the server's quest_key.
const QUEST_ICONS: Record<string, { icon: string; color: string; bg: string; cardBg: string; cardBorder: string }> = {
  daily_play:   { icon: "play",   color: "#1899D6", bg: "#E3F6FF", cardBg: "#F7FCFF", cardBorder: "#BEEAFD" },
  daily_match:  { icon: "scale",  color: "#58A700", bg: "#E8FFD7", cardBg: "#F4FFEE", cardBorder: "#C4E89E" },
  daily_goal:   { icon: "bolt",   color: "#E5A300", bg: "#FFF8E1", cardBg: "#FFFDF5", cardBorder: "#FFE9B8" },
  weekly_judge: { icon: "trophy", color: "#1CB0F6", bg: "#E3F6FF", cardBg: "#F7FCFF", cardBorder: "#BEEAFD" },
};

// Quests now render from real server state (get_quest_state): live progress, the
// XP reward, and whether each is claimable or already claimed this period. The
// reward is genuine — claim_quest grants it into total_xp. `refresh` is the real
// countdown to the next case (the daily reset).
export function questsView(rows: QuestStateRow[], refresh = ""): QuestsView {
  const wrap = (bg: string): CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "15px", flex: "none", background: bg });
  const mk = (row: QuestStateRow): QuestItemView => {
    const m = QUEST_ICONS[row.quest_key] ?? QUEST_ICONS.daily_play;
    const pct = Math.min(100, (row.progress / row.goal) * 100);
    return {
      questKey: row.quest_key,
      iconEl: icon(m.icon, 24, m.color),
      iconWrap: wrap(m.bg),
      label: row.label,
      countLabel: row.claimed ? "Claimed" : row.done ? "Ready to claim" : `${row.progress} / ${row.goal}`,
      countColor: row.done && !row.claimed ? "#58A700" : "#9AA08C",
      barWidth: pct + "%",
      barColor: row.claimed ? "#9EDF6A" : row.done ? "#58CC02" : m.color,
      rewardLabel: `+${row.reward_xp} XP`,
      claimable: row.done && !row.claimed,
      claimed: row.claimed,
      cardBg: m.cardBg,
      cardBorder: m.cardBorder,
    };
  };
  const daily = rows.filter((r) => r.qtype === "daily").map(mk);
  const big: QuestBigView[] = rows
    .filter((r) => r.qtype !== "daily")
    .map((r) => {
      const th = BIG_THEME[r.qtype] ?? BIG_THEME.weekly;
      return {
        questKey: r.quest_key,
        iconEl: icon(r.qtype === "monthly" ? "calendar" : "trophy", 32, "#fff"),
        label: r.label,
        sub: th.sub,
        count: String(r.progress),
        goalLabel: "/ " + r.goal,
        barWidth: Math.min(100, (r.progress / r.goal) * 100) + "%",
        rewardLabel: `+${r.reward_xp} XP`,
        claimable: r.done && !r.claimed,
        claimed: r.claimed,
        gradient: th.gradient,
        shadow: th.shadow,
      };
    });
  return { clockEl: icon("clock", 15, "#FF9600"), refresh, daily, big };
}

const BIG_THEME: Record<string, { gradient: string; shadow: string; sub: string }> = {
  weekly:  { gradient: "linear-gradient(135deg,#1CB0F6,#1899D6)", shadow: "0 6px 0 #137FB5", sub: "Weigh in on cases before the week resets" },
  monthly: { gradient: "linear-gradient(135deg,#CE82FF,#A95FE0)", shadow: "0 6px 0 #8A4BC0", sub: "Keep showing up all month for the big reward" },
};

export interface ProfileView {
  stats: { iconEl: JSX.Element | null; iconWrap: CSSProperties; value: string; label: string }[];
  achievements: { iconEl: JSX.Element | null; iconWrap: CSSProperties; bg: string; border: string; titleColor: string; title: string; desc: string; barWidth: string; barColor: string }[];
  figures: { iconEl: JSX.Element | null; iconWrap: CSSProperties; value: string; label: string }[];
  note: string;
  tier: string;
  levelEl: JSX.Element | null;
  leagueEl: JSX.Element | null;
  shareEl: JSX.Element | null;
}

export function profileView(s: GameState, st: PlayerStats): ProfileView {
  const wrap = (bg: string): CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "14px", flex: "none", background: bg });
  const stats = [
    { iconEl: icon("flame", 22, "#FF9600"), iconWrap: wrap("#FFF3E0"), value: String(s.streak), label: "Day streak" },
    { iconEl: icon("bolt", 22, "#E5A300"), iconWrap: wrap("#FFF8E1"), value: s.totalXp.toLocaleString(), label: "Total XP" },
    { iconEl: icon("calendar", 22, "#1CB0F6"), iconWrap: wrap("#E3F6FF"), value: String(st.casesJudged), label: "Cases judged" },
    { iconEl: icon("scale", 22, "#58A700"), iconWrap: wrap("#E8FFD7"), value: st.agreementPct + "%", label: "Agreement" },
  ];
  const ach = (
    iconName: string,
    ic: string,
    bg2: string,
    bg: string,
    border: string,
    title: string,
    desc: string,
    cur: number,
    goal: number,
    barColor: string
  ) => {
    const done = cur >= goal;
    return {
      iconEl: icon(iconName, 24, done ? ic : "#C2C7B6"),
      iconWrap: wrap(done ? bg2 : "#F0F2EA"),
      bg: done ? bg : "#fff",
      border: done ? border : "#E4EAD8",
      titleColor: done ? "#3C3C46" : "#7C8470",
      title,
      desc,
      barWidth: Math.min(100, (cur / goal) * 100) + "%",
      barColor,
    };
  };
  // All thresholds measured against the player's real vote history.
  const achievements = [
    ach("cap", "#58CC02", "#E8FFD7", "#F4FFEA", "#BFE89A", "Scholar", "Judge 50 cases", st.casesJudged, 50, "#58CC02"),
    ach("flame", "#FF9600", "#FFF3E0", "#FFF9F0", "#FFD9A6", "On Fire", "Reach a 14-day streak", s.streak, 14, "#FF9600"),
    ach("eye", "#CE82FF", "#F6ECFF", "#FBF6FF", "#E6D2FF", "Sharp Eye", "Match my verdict 10 times", st.correctCount, 10, "#CE82FF"),
    ach("scale", "#1CB0F6", "#E3F6FF", "#F2FBFF", "#BEEAFD", "Sage", "Match my verdict 50 times", st.correctCount, 50, "#1CB0F6"),
  ];
  const figures = [
    { iconEl: icon("scale", 20, "#58A700"), iconWrap: wrap("#E8FFD7"), value: st.agreementPct + "%", label: "Agreement with me" },
    { iconEl: icon("check", 20, "#1899D6"), iconWrap: wrap("#E3F6FF"), value: String(st.correctCount), label: "Verdicts matched" },
    { iconEl: icon("flame", 20, "#FF9600"), iconWrap: wrap("#FFF3E0"), value: String(s.bestStreak), label: "Best streak" },
    { iconEl: icon("star", 20, "#7A3FB0"), iconWrap: wrap("#F6ECFF"), value: String(s.level), label: "Level" },
  ];
  const note = st.casesJudged === 0
    ? "We haven't judged a case together yet. Make your first call and I'll start tracking how often we land in the same place."
    : `You've judged ${st.casesJudged} case${st.casesJudged === 1 ? "" : "s"} with me and we agree about ${st.agreementPct}% of the time. Trust your gut on the close calls — that's where the sharpest players pull ahead.`;
  return {
    stats,
    achievements,
    figures,
    note,
    tier: leagueTierName(s.totalXp),
    levelEl: icon("star", 15, "#CE82FF"),
    leagueEl: icon("trophy", 15, "#1CB0F6"),
    shareEl: icon("share", 16, "#1899D6"),
  };
}

export function jName(s?: GameState): string {
  const jid = judgeId(s);
  return baseCards(s).find((c) => c.id === jid)?.name ?? "Gemini Flash";
}
export function jPick(s?: GameState): string {
  const jid = judgeId(s);
  return baseCards(s).find((c) => c.id === jid)?.pick ?? "";
}
export function yourCard(s: GameState): BaseCard | undefined {
  return baseCards(s).find((c) => c.id === s.selected);
}

export { Icon };

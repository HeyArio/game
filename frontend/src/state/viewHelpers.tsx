import type { CSSProperties } from "react";
import { Icon, icon } from "../icons/Icon";
import type { BaseCard, CardId, GameState, LeaguePlayer } from "./types";
import { CROWD_LEADER, JUDGE_ID, baseCards } from "./useGameState";

export const COLORS: Record<string, string> = { A: "#58CC02", B: "#1CB0F6", C: "#CE82FF", D: "#FF9600" };

export function shade(hex: string): string {
  return (
    ({ "#58CC02": "#46A302", "#1CB0F6": "#1899D6", "#CE82FF": "#A95FE0", "#FF9600": "#E07F00" } as Record<string, string>)[hex] ||
    "#999"
  );
}

export function cardStyle(c: BaseCard, s: GameState): CSSProperties {
  const sel = s.selected === c.id;
  const isJ = c.id === JUDGE_ID;
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
    fontSize: "14px",
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

export function navView(screen: string, onSelect: (id: any) => void): NavItemView[] {
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
      iconEl: icon(it.icon, 19, active ? "#58A700" : "#9AA08C"),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 13px",
        borderRadius: "13px",
        cursor: "pointer",
        background: active ? "#E8FFD7" : "transparent",
        color: active ? "#58A700" : "#9AA08C",
        fontWeight: active ? 800 : 700,
        fontSize: "13.5px",
      },
    };
  });
}

export interface ViewCard extends BaseCard {
  modelLabel: string;
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
  return baseCards().map((c) => {
    const isJ = c.id === JUDGE_ID;
    const sel = s.selected === c.id;
    const barColor =
      s.reveal.judge && isJ ? "#58CC02" : s.reveal.judge && sel ? "#F57C00" : c.id === CROWD_LEADER ? "#1CB0F6" : "#BFC5B2";
    return {
      ...c,
      modelLabel: "MODEL " + c.letter,
      style: cardStyle(c, s),
      badgeStyle: badgeStyle(c),
      showId: s.reveal.ids,
      idColor: s.reveal.judge && isJ ? "#58A700" : "#74796B",
      showArbiter: s.reveal.judge && isJ,
      arbiterTag: s.reveal.judge && isJ && sel ? "MY PICK · SNAP!" : "MY PICK",
      showWrong: s.reveal.judge && sel && !isJ,
      showBars: s.reveal.bars,
      barColor,
      crowdTag: c.id === CROWD_LEADER ? " · TOP" : "",
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
  const todayIdx = 2;
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
  promoLineBefore: boolean;
  rankColor: string;
  style: CSSProperties;
}

export function leagueRowsView(s: GameState): LeagueRowView[] {
  const ranked = s.league.map((p, i) => ({ ...p, rank: i + 1 }));
  return ranked.slice(3, 8).map((p) => ({
    rank: p.rank,
    name: p.name,
    initial: p.initial,
    color: p.color,
    xp: p.xp.toLocaleString(),
    isYou: p.isYou,
    promoLineBefore: p.rank === 6,
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

export function badgesView(s: GameState): BadgeView[] {
  return [
    { iconEl: icon("cap", 25, "#58CC02"), label: "Scholar", iconWrap: bw("#E8FFD7"), labelColor: "#3C3C46", showCount: false },
    {
      iconEl: icon("flame", 25, "#FF9600"),
      label: "On Fire",
      iconWrap: bw("#FFF3E0"),
      labelColor: "#3C3C46",
      showCount: true,
      count: String(s.streak),
      ring: "#FF9600",
    },
    { iconEl: icon("users", 25, "#1CB0F6"), label: "Crowd Reader", iconWrap: bw("#E3F6FF"), labelColor: "#3C3C46", showCount: false },
    {
      iconEl: icon("eye", 25, "#CE82FF"),
      label: "Sharp Eye",
      iconWrap: bw("#F6ECFF"),
      labelColor: "#3C3C46",
      showCount: true,
      count: s.sharpEye + "/" + s.sharpEyeGoal,
      ring: "#CE82FF",
    },
    { iconEl: icon("star", 24, "#C2C7B6"), label: "Sage", iconWrap: bw("#F0F2EA"), labelColor: "#B2B7A6", showCount: false },
    { iconEl: icon("lock", 23, "#C2C7B6"), label: "Perfect Week", iconWrap: bw("#F0F2EA"), labelColor: "#B2B7A6", showCount: false },
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
  const your = baseCards().find((c) => c.id === s.selected);
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
  const your = baseCards().find((c) => c.id === s.selected);
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
  const youRank = (ranked.find((p) => p.isYou) || ({} as LeaguePlayer & { rank: number })).rank || 6;
  const tierDefs = [
    { name: "Bronze", icon: "shield", color: "#CD7F32" },
    { name: "Silver", icon: "shield", color: "#9AA6B2" },
    { name: "Gold", icon: "shield", color: "#E6A700" },
    { name: "Sapphire", icon: "shield", color: "#1CB0F6" },
    { name: "Emerald", icon: "trophy", color: "#58CC02", current: true },
    { name: "Ruby", icon: "crown", color: "#FF4B4B", locked: true },
    { name: "Diamond", icon: "gem", color: "#7DD3FC", locked: true },
  ];
  const tiers = tierDefs.map((t) => ({
    name: t.name,
    labelColor: t.current ? "#58A700" : t.locked ? "#C2C7B6" : "#7C8470",
    iconEl: icon(t.icon, 24, t.locked ? "#C7CCBC" : "#fff"),
    badgeStyle: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "50px",
      height: "50px",
      borderRadius: "16px",
      flex: "none",
      background: t.locked ? "#F0F2EA" : t.color,
      boxShadow: t.current ? "0 0 0 4px #DDF4C9, 0 3px 0 #3E9000" : "none",
    } as CSSProperties,
  }));
  const rows = ranked.map((p) => ({
    rankLabel: String(p.rank),
    name: p.isYou ? "You" : p.name,
    initial: p.initial,
    color: p.color,
    xp: p.xp.toLocaleString() + " XP",
    isYou: p.isYou,
    rankColor: p.rank <= 5 ? "#58A700" : p.rank >= 7 ? "#FF4B4B" : "#B2B7A6",
    promoLineBefore: p.rank === 6,
    demoLineBefore: p.rank === 7,
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
  const spots = youRank > 5 ? youRank - 5 : 0;
  const note =
    youRank <= 5
      ? "Nice — you're inside my promotion zone. Hold your nerve for two more days and I'll see you up in Ruby."
      : "You're " + spots + " spot" + (spots > 1 ? "s" : "") + " off the cut. Win one more case with me and you're right back in it — I like your chances.";
  return { tiers, rows, youRank, note, bigTrophyEl: icon("trophy", 34, "#fff"), promoIconEl: icon("trendUp", 13, "#58A700") };
}

export interface QuestItemView {
  iconEl: JSX.Element | null;
  iconWrap: CSSProperties;
  label: string;
  countLabel: string;
  countColor: string;
  barWidth: string;
  barColor: string;
  rewardEl: JSX.Element | null;
  rewardLabel: string;
  rewardStyle: CSSProperties;
}

export interface QuestsView {
  clockEl: JSX.Element | null;
  refresh: string;
  daily: QuestItemView[];
  weekly: { chestEl: JSX.Element | null; label: string; sub: string; count: string; goalLabel: string; barWidth: string };
}

export function questsView(s: GameState): QuestsView {
  const wrap = (bg: string): CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "15px", flex: "none", background: bg });
  const reward = (bg: string, col: string): CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: "5px", padding: "9px 13px", borderRadius: "12px", flex: "none", background: bg, color: col, fontWeight: 800, fontSize: "12.5px" });
  const mk = (
    iconName: string,
    iconColor: string,
    iconBg: string,
    label: string,
    cur: number,
    goal: number,
    barColor: string,
    rEl: JSX.Element | null,
    rLabel: string,
    rBg: string,
    rCol: string
  ): QuestItemView => {
    const done = cur >= goal;
    const pct = Math.min(100, (cur / goal) * 100);
    return {
      iconEl: icon(iconName, 24, iconColor),
      iconWrap: wrap(iconBg),
      label,
      countLabel: done ? "Done!" : cur + " / " + goal,
      countColor: done ? "#58A700" : "#9AA08C",
      barWidth: pct + "%",
      barColor: done ? "#58CC02" : barColor,
      rewardEl: done ? icon("check", 16, "#fff", 2.6) : rEl,
      rewardLabel: done ? "Claim" : rLabel,
      rewardStyle: done ? reward("#58CC02", "#fff") : reward(rBg, rCol),
    };
  };
  const daily = [
    mk("bolt", "#E5A300", "#FFF8E1", "Earn 40 XP today", s.dailyXp, 40, "#FFC800", icon("gem", 16, "#1899D6"), "+15", "#E3F6FF", "#1899D6"),
    mk("scale", "#58A700", "#E8FFD7", "Match my verdict twice", s.questMatch, 2, "#58CC02", icon("chest", 16, "#E07F00"), "Chest", "#FFF3E0", "#FF9600"),
    mk("flame", "#FF9600", "#FFF3E0", "Keep your streak alive", s.scored ? 1 : 0, 1, "#FF9600", icon("bolt", 16, "#E5A300"), "+10", "#FFF8E1", "#E5A300"),
  ];
  const weekly = { chestEl: icon("chest", 34, "#fff"), label: "Win 25 cases this week", sub: "Side with me 25 times before Sunday", count: "18", goalLabel: "/ 25", barWidth: (18 / 25) * 100 + "%" };
  return { clockEl: icon("clock", 15, "#FF9600"), refresh: "18h left", daily, weekly };
}

export interface ProfileView {
  stats: { iconEl: JSX.Element | null; iconWrap: CSSProperties; value: string; label: string }[];
  achievements: { iconEl: JSX.Element | null; iconWrap: CSSProperties; bg: string; border: string; titleColor: string; title: string; desc: string; barWidth: string; barColor: string }[];
  figures: { iconEl: JSX.Element | null; iconWrap: CSSProperties; value: string; label: string }[];
  note: string;
  levelEl: JSX.Element | null;
  leagueEl: JSX.Element | null;
  shareEl: JSX.Element | null;
}

export function profileView(s: GameState): ProfileView {
  const wrap = (bg: string): CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "14px", flex: "none", background: bg });
  const stats = [
    { iconEl: icon("flame", 22, "#FF9600"), iconWrap: wrap("#FFF3E0"), value: String(s.streak), label: "Day streak" },
    { iconEl: icon("bolt", 22, "#E5A300"), iconWrap: wrap("#FFF8E1"), value: s.totalXp.toLocaleString(), label: "Total XP" },
    { iconEl: icon("trophy", 22, "#1CB0F6"), iconWrap: wrap("#E3F6FF"), value: "Emerald", label: "League" },
    { iconEl: icon("medal", 22, "#CE82FF"), iconWrap: wrap("#F6ECFF"), value: "4", label: "Top 3 finishes" },
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
    barColor: string,
    done: boolean
  ) => ({
    iconEl: icon(iconName, 24, done ? ic : "#C2C7B6"),
    iconWrap: wrap(done ? bg2 : "#F0F2EA"),
    bg: done ? bg : "#fff",
    border: done ? border : "#E4EAD8",
    titleColor: done ? "#3C3C46" : "#7C8470",
    title,
    desc,
    barWidth: Math.min(100, (cur / goal) * 100) + "%",
    barColor,
  });
  const achievements = [
    ach("cap", "#58CC02", "#E8FFD7", "#F4FFEA", "#BFE89A", "Scholar", "Judged 200 cases", 218, 200, "#58CC02", true),
    ach("flame", "#FF9600", "#FFF3E0", "#FFF9F0", "#FFD9A6", "On Fire", "14-day streak", s.streak, 14, "#FF9600", true),
    ach("eye", "#CE82FF", "#F6ECFF", "#FBF6FF", "#E6D2FF", "Sharp Eye", "Match me 10 times", s.sharpEye, s.sharpEyeGoal, "#CE82FF", false),
    ach("users", "#1CB0F6", "#E3F6FF", "#F2FBFF", "#BEEAFD", "Crowd Reader", "Beat the crowd 25 times", 19, 25, "#1CB0F6", false),
  ];
  const figures = [
    { iconEl: icon("scale", 20, "#58A700"), iconWrap: wrap("#E8FFD7"), value: "72%", label: "Agreement with me" },
    { iconEl: icon("calendar", 20, "#1899D6"), iconWrap: wrap("#E3F6FF"), value: "218", label: "Cases judged" },
    { iconEl: icon("flame", 20, "#FF9600"), iconWrap: wrap("#FFF3E0"), value: "21", label: "Best streak" },
    { iconEl: icon("gem", 20, "#7A3FB0"), iconWrap: wrap("#F6ECFF"), value: "340", label: "Gems" },
  ];
  const note =
    "You agree with me about seven times in ten — and you're sharpest on sport and forecasting. Trust your gut on the close calls; that's where you keep beating the crowd.";
  return {
    stats,
    achievements,
    figures,
    note,
    levelEl: icon("star", 15, "#CE82FF"),
    leagueEl: icon("trophy", 15, "#1CB0F6"),
    shareEl: icon("share", 16, "#1899D6"),
  };
}

export function jName(): string {
  return baseCards().find((c) => c.id === JUDGE_ID)!.name;
}
export function jPick(): string {
  return baseCards().find((c) => c.id === JUDGE_ID)!.pick;
}
export function yourCard(s: GameState): BaseCard | undefined {
  return baseCards().find((c) => c.id === s.selected);
}

export { Icon };

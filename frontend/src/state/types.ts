export type CardId = "a" | "b" | "c" | "d";
export type Phase = "unvoted" | "voting" | "revealed";
export type Screen = "play" | "leagues" | "quests" | "profile";
export type OverlayKind = "streak" | "promo" | null;

export interface BaseCard {
  id: CardId;
  letter: string;
  name: string;
  pick: string;
  crowd: number;
  answer: string;
}

export interface LeaguePlayer {
  name: string;
  initial: string;
  color: string;
  xp: number;
  isYou?: boolean;
}

export interface RevealFlags {
  ids: boolean;
  bars: boolean;
  judge: boolean;
  verdict: boolean;
}

export interface DisplayPct {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface GameState {
  phase: Phase;
  selected: CardId | null;
  scored: boolean;
  screen: Screen;
  reveal: RevealFlags;
  displayPct: DisplayPct;
  displayDaily: number;
  earned: number;
  win: boolean;
  promoted: boolean;
  completed: boolean;
  overlay: OverlayKind;
  contEquipped: boolean;

  streak: number;
  totalXp: number;
  dailyXp: number;
  dailyGoal: number;
  sharpEye: number;
  sharpEyeGoal: number;
  questMatch: number;
  contLeft: number;
  league: LeaguePlayer[];
}

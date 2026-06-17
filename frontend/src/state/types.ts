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
  isBot?: boolean;
}

/** Real lifetime figures for the player, from get_player_stats(). */
export interface PlayerStats {
  casesJudged: number;
  correctCount: number;
  agreementPct: number;
  votesThisWeek: number;
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
  bestStreak: number;
  level: number;
  totalXp: number;
  dailyXp: number;
  dailyGoal: number;
  sharpEye: number;
  sharpEyeGoal: number;
  questMatch: number;
  contLeft: number;
  league: LeaguePlayer[];
  stats: PlayerStats;

  // Dynamic case data (replaces hardcoded baseCards / JUDGE_ID)
  cards: BaseCard[];
  judgeOptionId: string | null;   // the option.id the judge picked (from DB)
  judgeCardId: CardId | null;     // the a/b/c/d letter of the judge pick
  caseId: string | null;
  question: string;
  category: string;
  caseNo: number;
  timeLeft: string;
}

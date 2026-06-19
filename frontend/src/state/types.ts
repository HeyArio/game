export type CardId = "a" | "b" | "c" | "d";
export type Phase = "unvoted" | "voting" | "revealed";
export type Screen = "play" | "leagues" | "quests" | "profile";
export type OverlayKind = "streak" | "promo" | null;
export type Confidence = "low" | "med" | "high";

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

/** One quest's live state, from the get_quest_state() RPC. */
export interface QuestStateRow {
  quest_key: string;
  label: string;
  qtype: "daily" | "weekly" | "monthly";
  progress: number;
  goal: number;
  reward_xp: number;
  done: boolean;
  claimed: boolean;
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
  globalRank: number | null;   // the player's real rank across all players (+ bots)

  // Engagement: confidence wager + beat-the-crowd side-bet + judge reasoning
  confidence: Confidence;       // chosen before lock-in (default "med")
  crowdGuess: CardId | null;    // which option the player thinks the crowd backs
  judgeReasoning: string | null;// Arbi's "why", revealed after the verdict
  crowdLeaderId: CardId | null; // the actual crowd leader (revealed)
  crowdCorrect: boolean;        // did the crowd guess hit?
  crowdBonus: number;           // bonus XP from the crowd bet
  voteError: string | null;     // set when server scoring fails (so we never fake a verdict)

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

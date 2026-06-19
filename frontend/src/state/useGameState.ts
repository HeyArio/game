import { useCallback, useEffect, useRef, useState } from "react";
import type { BaseCard, CardId, Confidence, GameState, LeaguePlayer, OverlayKind, PlayerStats, Screen } from "./types";

// XP wager table (mirrors the submit-vote edge function for the dev/local path).
const XP_TABLE: Record<Confidence, { correct: number; wrong: number }> = {
  low:  { correct: 30,  wrong: 10 },
  med:  { correct: 50,  wrong: 5  },
  high: { correct: 100, wrong: 0  },
};
const CROWD_BONUS = 15;

export const JUDGE_ID: CardId = "d";
export const CROWD_LEADER: CardId = "b";

const STARTING_COUNTDOWN = 60138; // seconds, ported from `_countdown = 60138`

// Placeholder leaderboard shown only until the real global_leaderboard loads
// (and in offline dev mode). Opponents are labeled AI bots, never fake humans —
// and "You" starts at an honest 0 XP (last) so nobody is shown a fabricated
// standing before they've played.
function defaultLeague(): LeaguePlayer[] {
  return [
    { name: "Opus-Bot", initial: "O", color: "#FF9600", xp: 3120, isBot: true },
    { name: "Sonnet-Bot", initial: "S", color: "#1CB0F6", xp: 2980, isBot: true },
    { name: "Gemini-Bot", initial: "G", color: "#CE82FF", xp: 2870, isBot: true },
    { name: "Llama-Bot", initial: "L", color: "#58CC02", xp: 2680, isBot: true },
    { name: "Mistral-Bot", initial: "M", color: "#FF4B4B", xp: 2510, isBot: true },
    { name: "Grok-Bot", initial: "G", color: "#1CB0F6", xp: 2360, isBot: true },
    { name: "Qwen-Bot", initial: "Q", color: "#CE82FF", xp: 2240, isBot: true },
    { name: "You", initial: "Y", color: "#58CC02", xp: 0, isYou: true },
  ];
}

export function baseCards(): BaseCard[] {
  return [
    { id: "a", letter: "A", name: "GPT-OSS 120B", pick: "France", crowd: 28, answer: "Back-to-back finalists with absurd depth and a forward who decides knockout games on his own." },
    { id: "b", letter: "B", name: "Llama 3.3 70B", pick: "Argentina", crowd: 31, answer: "Defending champions — the 2022 spine is intact and tournament temperament wins tight knockouts." },
    { id: "c", letter: "C", name: "Mistral Small", pick: "Brazil", crowd: 22, answer: "A hungry new generation with the deepest attacking pool on the planet and a point to prove." },
    { id: "d", letter: "D", name: "Gemini Flash", pick: "Spain", crowd: 19, answer: "The Euro 2024 core matured two years; the midfield dictates tempo better than anyone alive." },
  ];
}

/** Level curve: 500 XP per level, starting at level 1. */
export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

export function fmtClock(t: number): string {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export interface VoteResult {
  wasCorrect: boolean;
  xpEarned: number;
  votedOptionId: string;
  judgeOptionId: string;
  judgeOptionLetter: string;
  judgeReasoning: string | null;
  crowdLeaderLetter: string | null;
  crowdCorrect: boolean;
  crowdBonus: number;
  alreadyVoted: boolean;
  options: { id: string; letter: string; is_judge_pick: boolean; live_pct: number }[];
}

export interface CaseData {
  caseId: string;
  question: string;
  category: string;
  caseNo: number;
  cards: BaseCard[];
  closesAt: string;
}

interface InitProps {
  streak?: number;
  totalXp?: number;
  dailyXp?: number;
  contLeft?: number;
  sharpEye?: number;
  /** Called when the user locks in. Returns server verdict. */
  onSubmitVote?: (
    caseId: string,
    optionId: string,
    confidence: Confidence,
    crowdGuessOptionId: string | null,
  ) => Promise<VoteResult | null>;
}

function makeInitState(props: InitProps): GameState {
  return {
    phase: "unvoted",
    selected: null,
    scored: false,
    screen: "play",
    reveal: { ids: false, bars: false, judge: false, verdict: false },
    displayPct: { a: 0, b: 0, c: 0, d: 0 },
    displayDaily: 0,
    earned: 0,
    win: false,
    promoted: false,
    completed: false,
    overlay: null,
    contEquipped: false,
    streak: props.streak ?? 0,
    bestStreak: props.streak ?? 0,
    level: levelFromXp(props.totalXp ?? 0),
    totalXp: props.totalXp ?? 0,
    dailyXp: props.dailyXp ?? 0,
    dailyGoal: 50,
    sharpEye: props.sharpEye ?? 0,
    sharpEyeGoal: 10,
    questMatch: 0,
    contLeft: props.contLeft ?? 0,
    league: defaultLeague(),
    stats: { casesJudged: 0, correctCount: 0, agreementPct: 0, votesThisWeek: 0 },
    globalRank: null,
    confidence: "med",
    crowdGuess: null,
    judgeReasoning: null,
    crowdLeaderId: null,
    crowdCorrect: false,
    crowdBonus: 0,
    // case data — overwritten via initCase() when DB data loads
    cards: baseCards(),
    judgeOptionId: null,
    judgeCardId: JUDGE_ID,
    caseId: null,
    question: "Loading today's case…",
    category: "",
    caseNo: 0,
    timeLeft: "—",
  };
}

/**
 * Faithful port of the Component class's state machine, timers, and effects.
 * Mirrors the original setTimeout/setInterval sequencing exactly:
 *   lockIn -> (850ms) -> startReveal -> ids(+120ms) -> bars(+520ms, starts pct count)
 *   -> judge(+1150ms) -> score(+1550ms)
 */
export function useGameState(props: InitProps = {}) {
  const [state, setState] = useState<GameState>(() => makeInitState(props));
  const onSubmitVoteRef = useRef(props.onSubmitVote);

  // Last real progress loaded from the DB. Now that the initial state defaults to
  // honest zeros, replaying today's case (reset) restores the player's true
  // streak / XP from here instead of showing 0s.
  const progressRef = useRef<Partial<Pick<GameState, "streak" | "totalXp" | "dailyXp" | "contLeft">>>({});

  // Mutable refs mirroring the original instance fields (timers, countdown, DOM-bound clocks).
  const t1 = useRef<number | null>(null);
  const t2 = useRef<number | null>(null);
  const t3 = useRef<number | null>(null);
  const t4 = useRef<number | null>(null);
  const t5 = useRef<number | null>(null);
  const pctInterval = useRef<number | null>(null);
  const dailyInterval = useRef<number | null>(null);
  const confettiInterval = useRef<number | null>(null);
  const countdownInterval = useRef<number | null>(null);

  const countdownRef = useRef<number>(STARTING_COUNTDOWN);
  const [countdownText, setCountdownText] = useState<string>(fmtClock(STARTING_COUNTDOWN));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const clearAllTimers = useCallback(() => {
    [t1, t2, t3, t4, t5].forEach((r) => {
      if (r.current != null) clearTimeout(r.current);
    });
    if (pctInterval.current != null) clearInterval(pctInterval.current);
    if (dailyInterval.current != null) clearInterval(dailyInterval.current);
  }, []);

  const countPct = useCallback((cards?: BaseCard[]) => {
    const targets: Record<CardId, number> = {} as any;
    (cards ?? baseCards()).forEach((c) => (targets[c.id] = c.crowd));
    const dur = 650;
    const t0 = Date.now();
    if (pctInterval.current != null) clearInterval(pctInterval.current);
    pctInterval.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const dp: any = {};
      (Object.keys(targets) as CardId[]).forEach((k) => (dp[k] = targets[k] * e));
      setState((s) => ({ ...s, displayPct: dp }));
      if (p >= 1 && pctInterval.current != null) {
        clearInterval(pctInterval.current);
        pctInterval.current = null;
      }
    }, 16);
  }, []);

  const countDaily = useCallback((earned: number) => {
    setState((s) => {
      const base = s.dailyXp;
      const target = Math.min(s.dailyGoal, base + earned);
      const dur = 700;
      const t0 = Date.now();
      if (dailyInterval.current != null) clearInterval(dailyInterval.current);
      dailyInterval.current = window.setInterval(() => {
        const p = Math.min(1, (Date.now() - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setState((s2) => ({ ...s2, displayDaily: base + (target - base) * e }));
        if (p >= 1 && dailyInterval.current != null) {
          clearInterval(dailyInterval.current);
          dailyInterval.current = null;
        }
      }, 16);
      return s;
    });
  }, []);

  const fireConfetti = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const W = (c.width = c.offsetWidth);
    const H = (c.height = c.offsetHeight);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const cols = ["#58CC02", "#FFC800", "#1CB0F6", "#CE82FF", "#FF9600"];
    const parts = Array.from({ length: 110 }, () => ({
      x: W * 0.5 + (Math.random() * 2 - 1) * 180,
      y: H * 0.42,
      vx: (Math.random() * 2 - 1) * 8,
      vy: (Math.random() * -1 - 0.4) * 12,
      s: 6 + Math.random() * 7,
      rot: Math.random() * 6.28,
      vr: (Math.random() * 2 - 1) * 0.35,
      col: cols[(Math.random() * cols.length) | 0],
    }));
    const t0 = Date.now();
    if (confettiInterval.current != null) clearInterval(confettiInterval.current);
    confettiInterval.current = window.setInterval(() => {
      const dt = Date.now() - t0;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.34;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - dt / 1200);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (dt >= 1200) {
        ctx.clearRect(0, 0, W, H);
        if (confettiInterval.current != null) {
          clearInterval(confettiInterval.current);
          confettiInterval.current = null;
        }
      }
    }, 16);
  }, []);

  // Apply server vote result into game state (used by both live voting and alreadyVoted replay)
  const applyVoteResult = useCallback((result: VoteResult) => {
    setState((s) => {
      const win = result.wasCorrect;
      const earned = result.xpEarned;
      // Map live_pct from server result onto displayPct keyed by card letter
      const dp: any = { a: 0, b: 0, c: 0, d: 0 };
      result.options.forEach((o) => { dp[o.letter.toLowerCase()] = o.live_pct; });
      const judgeCardId = (result.judgeOptionLetter?.toLowerCase() ?? "d") as CardId;
      const league = s.league
        .map((p) => (p.isYou ? { ...p, xp: p.xp + earned } : p))
        .sort((a, b) => b.xp - a.xp);
      const youRank = league.findIndex((p) => p.isYou) + 1;
      // Update crowd values in cards
      const cards = s.cards.map((c) => {
        const opt = result.options.find((o) => o.letter.toLowerCase() === c.id);
        return opt ? { ...c, crowd: opt.live_pct } : c;
      });
      const crowdLeaderId = (result.crowdLeaderLetter?.toLowerCase() ?? null) as CardId | null;
      return {
        ...s,
        cards,
        judgeCardId,
        judgeOptionId: result.judgeOptionId,
        judgeReasoning: result.judgeReasoning ?? null,
        crowdLeaderId,
        crowdCorrect: result.crowdCorrect,
        crowdBonus: result.crowdBonus,
        reveal: { ...s.reveal, verdict: true },
        scored: true,
        win,
        earned,
        totalXp: s.totalXp + earned,
        level: levelFromXp(s.totalXp + earned),
        streak: s.streak + 1,
        bestStreak: Math.max(s.bestStreak, s.streak + 1),
        dailyXp: Math.min(s.dailyGoal, s.dailyXp + earned),
        sharpEye: win ? Math.min(s.sharpEyeGoal, s.sharpEye + 1) : s.sharpEye,
        questMatch: win ? Math.min(2, s.questMatch + 1) : s.questMatch,
        displayPct: dp,
        league,
        promoted: win && youRank <= 5,
      };
    });
    if (result.wasCorrect) queueMicrotask(() => fireConfetti());
    queueMicrotask(() => countDaily(result.xpEarned));
  }, [countDaily, fireConfetti]);

  const score = useCallback(async () => {
    let currentState: GameState | null = null;
    setState((s) => { currentState = s; return s; });
    await new Promise<void>(r => setTimeout(r, 0)); // flush
    setState((s) => {
      if (s.scored) return s;
      currentState = s;
      return s;
    });
    if (!currentState) return;
    const s = currentState as GameState;
    if (s.scored) return;

    const onVote = onSubmitVoteRef.current;
    if (onVote && s.caseId && s.selected) {
      // Find the option ID that matches the selected card letter
      // The option id is stored on the card when we call initCase
      const selectedCard = s.cards.find(c => c.id === s.selected);
      const optionId = (selectedCard as any)?._optionId as string | undefined;
      const crowdCard = s.crowdGuess ? s.cards.find(c => c.id === s.crowdGuess) : undefined;
      const crowdOptionId = (crowdCard as any)?._optionId as string | undefined;
      if (optionId) {
        const result = await onVote(s.caseId, optionId, s.confidence, crowdOptionId ?? null);
        if (result) { applyVoteResult(result); return; }
      }
    }

    // Fallback: local scoring (dev mode / no backend), mirroring the server math.
    setState((s2) => {
      if (s2.scored) return s2;
      const win = s2.selected === (s2.judgeCardId ?? JUDGE_ID);
      // Crowd leader by seeded crowd %.
      const crowdLeaderId = [...s2.cards].sort((a, b) => b.crowd - a.crowd)[0]?.id ?? null;
      const crowdCorrect = !!s2.crowdGuess && s2.crowdGuess === crowdLeaderId;
      const crowdBonus = crowdCorrect ? CROWD_BONUS : 0;
      const tier = XP_TABLE[s2.confidence] ?? XP_TABLE.med;
      const earned = (win ? tier.correct : tier.wrong) + crowdBonus;
      const league = s2.league
        .map((p) => (p.isYou ? { ...p, xp: p.xp + earned } : p))
        .sort((a, b) => b.xp - a.xp);
      const youRank = league.findIndex((p) => p.isYou) + 1;
      queueMicrotask(() => { countDaily(earned); if (win) fireConfetti(); });
      return { ...s2, reveal: { ...s2.reveal, verdict: true }, scored: true, win, earned,
        judgeReasoning: s2.judgeReasoning, crowdLeaderId, crowdCorrect, crowdBonus,
        totalXp: s2.totalXp + earned, level: levelFromXp(s2.totalXp + earned),
        streak: s2.streak + 1, bestStreak: Math.max(s2.bestStreak, s2.streak + 1),
        dailyXp: Math.min(s2.dailyGoal, s2.dailyXp + earned),
        sharpEye: win ? Math.min(s2.sharpEyeGoal, s2.sharpEye + 1) : s2.sharpEye,
        questMatch: win ? Math.min(2, s2.questMatch + 1) : s2.questMatch,
        league, promoted: win && youRank <= 5 };
    });
  }, [countDaily, fireConfetti, applyVoteResult]);

  const startReveal = useCallback(() => {
    setState((s) => ({ ...s, phase: "revealed" }));
    t2.current = window.setTimeout(() => {
      setState((s) => ({ ...s, reveal: { ...s.reveal, ids: true } }));
    }, 120);
    t3.current = window.setTimeout(() => {
      setState((s) => ({ ...s, reveal: { ...s.reveal, bars: true } }));
      countPct();
    }, 520);
    t4.current = window.setTimeout(() => {
      setState((s) => ({ ...s, reveal: { ...s.reveal, judge: true } }));
    }, 1150);
    t5.current = window.setTimeout(() => {
      score();
    }, 1550);
  }, [countPct, score]);

  const lockIn = useCallback(() => {
    setState((s) => {
      if (s.phase !== "unvoted" || !s.selected) return s;
      t1.current = window.setTimeout(() => startReveal(), 850);
      return { ...s, phase: "voting" };
    });
  }, [startReveal]);

  const selectCard = useCallback((id: CardId) => {
    setState((s) => (s.phase === "unvoted" ? { ...s, selected: id } : s));
  }, []);

  const setConfidence = useCallback((c: Confidence) => {
    setState((s) => (s.phase === "unvoted" ? { ...s, confidence: c } : s));
  }, []);

  // Tap the same option again to clear the crowd guess.
  const setCrowdGuess = useCallback((id: CardId) => {
    setState((s) => (s.phase === "unvoted" ? { ...s, crowdGuess: s.crowdGuess === id ? null : id } : s));
  }, []);

  const setScreen = useCallback((id: Screen) => {
    setState((s) => ({ ...s, screen: id }));
  }, []);

  const openStreak = useCallback(() => setState((s) => ({ ...s, overlay: "streak" as OverlayKind })), []);
  const closeOverlay = useCallback(() => setState((s) => ({ ...s, overlay: null as OverlayKind })), []);

  const equipContinuance = useCallback(() => {
    setState((s) => {
      if (s.contEquipped || s.contLeft <= 0) return s;
      return { ...s, contEquipped: true, contLeft: s.contLeft - 1 };
    });
  }, []);

  const advance = useCallback(() => {
    setState((s) => {
      if (s.promoted) {
        fireConfetti();
        return { ...s, overlay: "promo" as OverlayKind };
      }
      return { ...s, completed: true };
    });
  }, [fireConfetti]);

  const dismissPromo = useCallback(() => {
    setState((s) => ({ ...s, overlay: null, completed: true }));
  }, []);

  const reset = useCallback(() => {
    clearAllTimers();
    // Preserve the player's real progress across a replay (defaults are now 0s).
    setState(() => makeInitState({ ...props, ...progressRef.current }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAllTimers]);

  const setCanvas = useCallback((el: HTMLCanvasElement | null) => {
    if (el) canvasRef.current = el;
  }, []);

  // componentDidMount: the 1s countdown tick, mirrored via DOM refs in the original
  // (it pushed text directly into subscribed elements). Here we expose it as React
  // state (`countdownText`) consumed by components, which is the natural React analog.
  useEffect(() => {
    countdownInterval.current = window.setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1);
      setCountdownText(fmtClock(countdownRef.current));
    }, 1000);
    return () => {
      clearAllTimers();
      if (confettiInterval.current != null) clearInterval(confettiInterval.current);
      if (countdownInterval.current != null) clearInterval(countdownInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load real case data from DB into game state */
  const initCase = useCallback((data: CaseData & { judgeCardId?: CardId | null }) => {
    const secondsLeft = Math.max(0, Math.floor((new Date(data.closesAt).getTime() - Date.now()) / 1000));
    countdownRef.current = secondsLeft;
    setCountdownText(fmtClock(secondsLeft));
    setState((s) => ({
      ...s,
      caseId: data.caseId,
      question: data.question,
      category: data.category,
      caseNo: data.caseNo,
      cards: data.cards,
      // Production: judgeCardId stays null until the server reveals it on vote.
      // Testing (client-side LLM): the generator passes judgeCardId so the
      // local scoring fallback can decide correctness without the edge function.
      judgeCardId: data.judgeCardId ?? null,
      judgeOptionId: null,
    }));
  }, []);

  /** Load user progress from DB into game state */
  const initProgress = useCallback((p: { streak: number; totalXp: number; dailyXp: number; contLeft: number; bestStreak: number }) => {
    progressRef.current = { streak: p.streak, totalXp: p.totalXp, dailyXp: p.dailyXp, contLeft: p.contLeft };
    setState((s) => ({
      ...s,
      streak: p.streak,
      bestStreak: Math.max(p.bestStreak, p.streak),
      level: levelFromXp(p.totalXp),
      totalXp: p.totalXp,
      dailyXp: p.dailyXp,
      contLeft: p.contLeft,
    }));
  }, []);

  /** Load the real leaderboard from DB into game state */
  const initLeague = useCallback((players: LeaguePlayer[]) => {
    if (!players.length) return;
    setState((s) => ({ ...s, league: [...players].sort((a, b) => b.xp - a.xp) }));
  }, []);

  /** Load real lifetime stats (cases judged, agreement %, …) into game state */
  const initStats = useCallback((stats: PlayerStats) => {
    setState((s) => ({ ...s, stats }));
  }, []);

  /** Load the player's real global rank (across all players + bots) */
  const initRank = useCallback((rank: number | null) => {
    setState((s) => ({ ...s, globalRank: rank }));
  }, []);

  return {
    state,
    countdownText,
    setCanvas,
    actions: {
      selectCard,
      setConfidence,
      setCrowdGuess,
      lockIn,
      score,
      equipContinuance,
      advance,
      dismissPromo,
      reset,
      setScreen,
      openStreak,
      closeOverlay,
      fireConfetti,
      initCase,
      initProgress,
      initLeague,
      initStats,
      initRank,
      applyVoteResult,
    },
  };
}


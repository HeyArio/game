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
  bestStreak?: number;
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
    alreadyPlayed: false,
    overlay: null,
    contEquipped: false,
    streak: props.streak ?? 0,
    bestStreak: props.bestStreak ?? props.streak ?? 0,
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
    voteError: null,
    // case data — overwritten via initCase() when DB data loads
    cards: baseCards(),
    judgeOptionId: null,
    judgeCardId: JUDGE_ID,
    caseId: null,
    question: "Loading today's case…",
    category: "",
    caseNo: 0,
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
  // Keep the latest callback so score() never calls a stale closure.
  useEffect(() => { onSubmitVoteRef.current = props.onSubmitVote; }, [props.onSubmitVote]);

  // Last real progress loaded from the DB. Now that the initial state defaults to
  // honest zeros, replaying today's case (reset) restores the player's true
  // streak / XP from here instead of showing 0s.
  const progressRef = useRef<Partial<Pick<GameState, "streak" | "bestStreak" | "totalXp" | "dailyXp" | "contLeft">>>({});

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
  // Absolute close time (ms epoch). The countdown is derived from this on every
  // tick so it can't drift with setInterval jitter or background-tab throttling —
  // it self-corrects to wall-clock. initCase sets it to the real closes_at.
  const countdownTargetRef = useRef<number>(Date.now() + STARTING_COUNTDOWN * 1000);
  const [countdownText, setCountdownText] = useState<string>(fmtClock(STARTING_COUNTDOWN));
  // Seconds remaining until the case closes — exposed so the UI can warn when a
  // streak is about to lapse (the formatted text alone is awkward to threshold).
  const [countdownSeconds, setCountdownSeconds] = useState<number>(STARTING_COUNTDOWN);

  // Tracks whether the player is reviewing a vote they already cast today. Kept
  // as a ref (not just state) so `reset` can synchronously refuse to replay a
  // recorded vote — there's exactly one vote per case per day.
  const alreadyPlayedRef = useRef<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const clearAllTimers = useCallback(() => {
    [t1, t2, t3, t4, t5].forEach((r) => {
      if (r.current != null) clearTimeout(r.current);
    });
    if (pctInterval.current != null) clearInterval(pctInterval.current);
    if (dailyInterval.current != null) clearInterval(dailyInterval.current);
    if (confettiInterval.current != null) clearInterval(confettiInterval.current);
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

  // Animate the daily-goal bar from whatever is currently shown (displayDaily) up
  // to the authoritative dailyXp. Callers update dailyXp first, then invoke this —
  // reading the target from state (rather than an `earned` delta) is what makes
  // the bar count up smoothly instead of jumping to the end value.
  const countDaily = useCallback(() => {
    setState((s) => {
      const base = s.displayDaily;
      const target = Math.min(s.dailyGoal, s.dailyXp);
      if (target <= base) return { ...s, displayDaily: target };
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
    // Honor reduced-motion: the CSS keyframes are neutralised under the media
    // query, but the confetti is canvas-drawn so we have to opt out in JS.
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
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

  // Apply a server vote result into game state.
  //
  // Two distinct cases, and conflating them was the source of the "congratulated
  // no matter what you pick" bug:
  //
  //  • A FRESH vote (result.alreadyVoted === false): the server just recorded the
  //    vote and incremented progress server-side, so we mirror that locally —
  //    add XP, bump the streak, animate the daily bar, fire confetti on a win.
  //
  //  • An ALREADY-CAST vote (result.alreadyVoted === true): the player is just
  //    reviewing a case they already played (on load, or via a stale replay).
  //    The server did NOT award anything again, so we must NOT re-add XP, bump
  //    the streak, or re-fire the celebration — otherwise every revisit/replay
  //    re-congratulates them and re-shows their old win against a new pick.
  //    We snap straight to a locked reveal of THEIR original answer.
  const applyVoteResult = useCallback((result: VoteResult) => {
    const review = result.alreadyVoted === true;
    if (review) alreadyPlayedRef.current = true;
    setState((s) => {
      const win = result.wasCorrect;
      const earned = result.xpEarned;
      // Map live_pct from server result onto displayPct keyed by card letter
      const dp: any = { a: 0, b: 0, c: 0, d: 0 };
      result.options.forEach((o) => { dp[o.letter.toLowerCase()] = o.live_pct; });
      const judgeCardId = (result.judgeOptionLetter?.toLowerCase() ?? "d") as CardId;
      // Update crowd values in cards
      const cards = s.cards.map((c) => {
        const opt = result.options.find((o) => o.letter.toLowerCase() === c.id);
        return opt ? { ...c, crowd: opt.live_pct } : c;
      });
      const crowdLeaderId = (result.crowdLeaderLetter?.toLowerCase() ?? null) as CardId | null;

      // Common reveal fields (the verdict, judge pick, crowd, live %).
      const revealed = {
        ...s,
        cards,
        judgeCardId,
        judgeOptionId: result.judgeOptionId,
        judgeReasoning: result.judgeReasoning ?? null,
        crowdLeaderId,
        crowdCorrect: result.crowdCorrect,
        crowdBonus: result.crowdBonus,
        scored: true,
        win,
        earned,
        displayPct: dp,
      };

      if (review) {
        // Reviewing an already-played case: lock it, show their real pick, and
        // leave progress (XP / streak / league) exactly as loaded — no re-award.
        const votedOpt = result.options.find((o) => o.id === result.votedOptionId);
        const selected = (votedOpt?.letter.toLowerCase() ?? s.selected) as CardId | null;
        return {
          ...revealed,
          selected,
          phase: "revealed",
          alreadyPlayed: true,
          reveal: { ids: true, bars: true, judge: true, verdict: true },
          displayDaily: s.dailyXp,
        };
      }

      // Fresh vote: mirror the server-side progress increment locally.
      const league = s.league
        .map((p) => (p.isYou ? { ...p, xp: p.xp + earned } : p))
        .sort((a, b) => b.xp - a.xp);
      const youRank = league.findIndex((p) => p.isYou) + 1;
      return {
        ...revealed,
        reveal: { ...s.reveal, verdict: true },
        totalXp: s.totalXp + earned,
        level: levelFromXp(s.totalXp + earned),
        streak: s.streak + 1,
        bestStreak: Math.max(s.bestStreak, s.streak + 1),
        dailyXp: Math.min(s.dailyGoal, s.dailyXp + earned),
        sharpEye: win ? Math.min(s.sharpEyeGoal, s.sharpEye + 1) : s.sharpEye,
        questMatch: win ? Math.min(2, s.questMatch + 1) : s.questMatch,
        league,
        promoted: win && youRank <= 5,
      };
    });
    // Celebration + daily-bar animation only ever fire for a genuinely new vote.
    if (!review) {
      if (result.wasCorrect) queueMicrotask(() => fireConfetti());
      queueMicrotask(() => countDaily());
    }
  }, [countDaily, fireConfetti]);

  // Load an existing vote the player already cast on today's case, so a returning
  // player lands directly on their locked result instead of a fresh, votable
  // board. The payload is the submit-vote "alreadyVoted" response.
  const loadExistingVote = useCallback((result: VoteResult) => {
    applyVoteResult({ ...result, alreadyVoted: true });
  }, [applyVoteResult]);

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
    if (onVote) {
      // Production: the server is the single source of truth for the verdict.
      // Never fabricate one locally — if the call fails, surface it and let the
      // player lock in again. (The old code fell back to a hardcoded "judge = D"
      // verdict on any failure, which could wrongly flash "We agree!" whenever
      // card D was picked.)
      const selectedCard = s.cards.find((c) => c.id === s.selected);
      const optionId = selectedCard?._optionId;
      const crowdCard = s.crowdGuess ? s.cards.find((c) => c.id === s.crowdGuess) : undefined;
      const crowdOptionId = crowdCard?._optionId;
      const result = s.caseId && optionId
        ? await onVote(s.caseId, optionId, s.confidence, crowdOptionId ?? null)
        : null;
      if (result) { applyVoteResult(result); return; }
      setState((s2) => ({
        ...s2,
        phase: "unvoted",
        scored: false,
        reveal: { ids: false, bars: false, judge: false, verdict: false },
        voteError: "Couldn't reach the scoring server — check your connection and lock in again.",
      }));
      return;
    }

    // No backend (client/dev test path only): score locally against the
    // judgeCardId the client generator supplied.
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
      queueMicrotask(() => { countDaily(); if (win) fireConfetti(); });
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
      return { ...s, phase: "voting", voteError: null };
    });
  }, [startReveal]);

  const selectCard = useCallback((id: CardId) => {
    setState((s) => (s.phase === "unvoted" ? { ...s, selected: id, voteError: null } : s));
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
    // A recorded vote can't be replayed — one vote per case per day. (This path
    // only exists for the no-backend dev/client flow, where nothing is stored.)
    if (alreadyPlayedRef.current) return;
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
    const tick = () => {
      const secs = Math.max(0, Math.round((countdownTargetRef.current - Date.now()) / 1000));
      countdownRef.current = secs;
      setCountdownText(fmtClock(secs));
      setCountdownSeconds(secs);
    };
    tick(); // sync immediately on mount / refocus instead of waiting 1s
    countdownInterval.current = window.setInterval(tick, 1000);
    return () => {
      clearAllTimers();
      if (confettiInterval.current != null) clearInterval(confettiInterval.current);
      if (countdownInterval.current != null) clearInterval(countdownInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load real case data from DB into game state */
  const initCase = useCallback((data: CaseData & { judgeCardId?: CardId | null }) => {
    countdownTargetRef.current = new Date(data.closesAt).getTime();
    const secondsLeft = Math.max(0, Math.floor((countdownTargetRef.current - Date.now()) / 1000));
    countdownRef.current = secondsLeft;
    setCountdownText(fmtClock(secondsLeft));
    setCountdownSeconds(secondsLeft);
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
    const bestStreak = Math.max(p.bestStreak, p.streak);
    progressRef.current = { streak: p.streak, bestStreak, totalXp: p.totalXp, dailyXp: p.dailyXp, contLeft: p.contLeft };
    setState((s) => ({
      ...s,
      streak: p.streak,
      bestStreak,
      level: levelFromXp(p.totalXp),
      totalXp: p.totalXp,
      dailyXp: p.dailyXp,
      // Seed the goal bar from real daily XP so a returning player who hasn't
      // voted yet sees their actual progress instead of 0 / goal.
      displayDaily: Math.min(s.dailyGoal, p.dailyXp),
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

  /** Apply a claimed quest reward: the server returns the authoritative new
   *  total/level, so we just mirror it into state (and the "You" rail row). */
  const grantBonusXp = useCallback((totalXp: number, level: number) => {
    progressRef.current = { ...progressRef.current, totalXp };
    setState((s) => {
      const league = s.league
        .map((p) => (p.isYou ? { ...p, xp: totalXp } : p))
        .sort((a, b) => b.xp - a.xp);
      return { ...s, totalXp, level, league };
    });
  }, []);

  return {
    state,
    countdownText,
    countdownSeconds,
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
      grantBonusXp,
      applyVoteResult,
      loadExistingVote,
    },
  };
}


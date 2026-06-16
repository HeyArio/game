import { useCallback, useEffect, useRef, useState } from "react";
import type { BaseCard, CardId, GameState, LeaguePlayer, OverlayKind, Screen } from "./types";

export const JUDGE_ID: CardId = "d";
export const CROWD_LEADER: CardId = "b";

const STARTING_COUNTDOWN = 60138; // seconds, ported from `_countdown = 60138`

function initLeague(): LeaguePlayer[] {
  return [
    { name: "Mara K.", initial: "M", color: "#FF9600", xp: 3120 },
    { name: "Devin R.", initial: "D", color: "#1CB0F6", xp: 2980 },
    { name: "Priya S.", initial: "P", color: "#CE82FF", xp: 2870 },
    { name: "Tomás L.", initial: "T", color: "#58CC02", xp: 2680 },
    { name: "Yuki N.", initial: "Y", color: "#FF4B4B", xp: 2510 },
    { name: "You", initial: "Y", color: "#58CC02", xp: 2480, isYou: true },
    { name: "Aria B.", initial: "A", color: "#1CB0F6", xp: 2360 },
    { name: "Sven O.", initial: "S", color: "#CE82FF", xp: 2240 },
  ];
}

export function baseCards(): BaseCard[] {
  return [
    { id: "a", letter: "A", name: "ASTRA", pick: "France", crowd: 28, answer: "Back-to-back finalists with absurd depth and a forward who decides knockout games on his own." },
    { id: "b", letter: "B", name: "BOREAS", pick: "Argentina", crowd: 31, answer: "Defending champions — the 2022 spine is intact and tournament temperament wins tight knockouts." },
    { id: "c", letter: "C", name: "CIRRUS", pick: "Brazil", crowd: 22, answer: "A hungry new generation with the deepest attacking pool on the planet and a point to prove." },
    { id: "d", letter: "D", name: "DELPHI", pick: "Spain", crowd: 19, answer: "The Euro 2024 core matured two years; the midfield dictates tempo better than anyone alive." },
  ];
}

export function fmtClock(t: number): string {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

interface InitProps {
  streak?: number;
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
    streak: props.streak ?? 14,
    totalXp: 2480,
    dailyXp: 0,
    dailyGoal: 50,
    sharpEye: 7,
    sharpEyeGoal: 10,
    questMatch: 1,
    contLeft: 2,
    league: initLeague(),
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

  const countPct = useCallback(() => {
    const targets: Record<CardId, number> = {} as any;
    baseCards().forEach((c) => (targets[c.id] = c.crowd));
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

  const score = useCallback(() => {
    setState((s) => {
      if (s.scored) return s;
      const win = s.selected === JUDGE_ID;
      const earned = win ? 50 : 10;
      const league = s.league
        .map((p) => (p.isYou ? { ...p, xp: p.xp + earned } : p))
        .sort((a, b) => b.xp - a.xp);
      const youRank = league.findIndex((p) => p.isYou) + 1;
      const next: GameState = {
        ...s,
        reveal: { ...s.reveal, verdict: true },
        scored: true,
        win,
        earned,
        totalXp: s.totalXp + earned,
        streak: s.streak + 1,
        dailyXp: Math.min(s.dailyGoal, s.dailyXp + earned),
        sharpEye: win ? Math.min(s.sharpEyeGoal, s.sharpEye + 1) : s.sharpEye,
        questMatch: win ? Math.min(2, s.questMatch + 1) : s.questMatch,
        league,
        promoted: win && youRank <= 5,
      };
      // Side effects fired from the original score(): countDaily + confetti.
      queueMicrotask(() => {
        countDaily(earned);
        if (win) fireConfetti();
      });
      return next;
    });
  }, [countDaily, fireConfetti]);

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
    setState(() => makeInitState(props));
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

  return {
    state,
    countdownText,
    setCanvas,
    actions: {
      selectCard,
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
    },
  };
}

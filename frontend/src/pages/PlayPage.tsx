import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Mascot } from "../components/Mascot";
import { AnswerCard } from "../components/AnswerCard";
import { icon } from "../icons/Icon";
import { useIsMobile } from "../hooks/useMediaQuery";
import { shareResultImage, type SharePlatform } from "../lib/shareCard";
import { createChallenge, shareChallengeLink, type Challenge } from "../lib/challenge";
import { nazarbanUrl } from "../lib/nazarban";
import { ChallengeBanner, ChallengeOutcome } from "../components/ChallengeBanner";
import type { GameState, CardId, Confidence } from "../state/types";
import {
  badgesView,
  COLORS,
  continueActiveStyle,
  continueStyle,
  jName,
  jPick,
  leagueRowsView,
  lockActiveStyle,
  lockStyle,
  rewardChipsView,
  viewCards,
  weekDaysView,
  yourCard,
} from "../state/viewHelpers";

export interface PlayPageProps {
  state: GameState;
  countdownText: string;
  /** Seconds left until the case closes — drives the streak-at-risk nudge. */
  countdownSeconds?: number;
  caseLoading?: boolean;
  noCase?: boolean;
  /** Whether replaying the case is allowed (dev/local path only — a real,
   *  recorded vote can't be replayed). */
  canReplay?: boolean;
  /** Set when the visitor arrived via a challenge link (?c=<id>). */
  challenge?: Challenge | null;
  onSelectCard: (id: CardId) => void;
  onSetConfidence: (c: Confidence) => void;
  onSetCrowdGuess: (id: CardId) => void;
  onLockIn: () => void;
  onAdvance: () => void;
  onReplay: () => void;
}

export function PlayPage({ state, countdownText, countdownSeconds, caseLoading, noCase, canReplay, challenge, onSelectCard, onSetConfidence, onSetCrowdGuess, onLockIn, onAdvance, onReplay }: PlayPageProps) {
  const isMobile = useIsMobile();
  const cards = viewCards(state);
  const your = yourCard(state);
  // Streak safety net: once a player has a streak going, warn them while there's
  // still time to play today's case but the deadline is close (< 3h). Only while
  // the case is still open to them (unvoted, not already played).
  const STREAK_RISK_WINDOW = 3 * 3600;
  const streakAtRisk =
    state.phase === "unvoted" &&
    !state.alreadyPlayed &&
    !state.scored &&
    state.streak > 0 &&
    countdownSeconds != null &&
    countdownSeconds > 0 &&
    countdownSeconds <= STREAK_RISK_WINDOW;
  const resultAccent = state.win ? "#58A700" : "#F57C00";
  // Move keyboard focus to the verdict when it reveals, so screen-reader and
  // keyboard users aren't stranded on the now-removed Lock button.
  const verdictHeadingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.reveal.verdict) verdictHeadingRef.current?.focus();
  }, [state.reveal.verdict]);
  const weekDays = weekDaysView(state);
  const leagueRows = leagueRowsView(state);
  const badges = badgesView(state, state.stats);

  // Keyboard shortcuts: 1–4 to pick an answer, Enter to lock in. A fast,
  // low-friction way to play that suits the "snap judgment" loop.
  useEffect(() => {
    if (state.phase !== "unvoted") return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key >= "1" && e.key <= "4") {
        const id = (["a", "b", "c", "d"] as CardId[])[Number(e.key) - 1];
        if (state.cards.some((c) => c.id === id)) { e.preventDefault(); onSelectCard(id); }
      } else if (e.key === "Enter" && state.selected) {
        e.preventDefault();
        onLockIn();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, state.selected, state.cards, onSelectCard, onLockIn]);

  // qspin: 24 spinner ticks fanned around a circle, opacity ramping with index — ported 1:1.
  const spinnerTicks = Array.from({ length: 24 }, (_, i) => ({
    style: {
      position: "absolute" as const,
      left: "50%",
      top: "50%",
      width: "3px",
      height: "8px",
      marginLeft: "-1.5px",
      marginTop: "-4px",
      borderRadius: "2px",
      background: "#58CC02",
      transformOrigin: "center",
      transform: `rotate(${i * 15}deg) translateY(-12px)`,
      opacity: (i + 1) / 24,
    },
  }));

  // Loading skeleton
  if (caseLoading) {
    return (
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "60px 24px", display: "flex", justifyContent: "center" }}>
        <span style={{ animation: "qbob 3s ease-in-out infinite" }}><Mascot size={64} mood="neutral" /></span>
      </div>
    );
  }

  // No case today
  if (noCase) {
    return (
      <div style={{ maxWidth: 700, margin: "40px auto", padding: "32px 28px", background: "#fff", border: "2px solid #E4EAD8", borderRadius: 24, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", animation: "qbob 3s ease-in-out infinite" }}><Mascot size={72} mood="soft" /></div>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 24, color: "#3C3C46", marginTop: 12 }}>No case today — yet</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#8E9582", marginTop: 6 }}>The docket is empty. Check back soon.</div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        padding: isMobile ? "18px 14px" : "32px 24px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 330px",
        gap: isMobile ? 18 : 28,
        alignItems: "start",
      }}
    >
      {/* MAIN COLUMN */}
      <main>
        {challenge && !state.reveal.verdict && (
          <ChallengeBanner challenge={challenge} todayCaseNo={state.caseNo} />
        )}
        {streakAtRisk && (
          <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "12px 16px", background: "#FFF3E0", border: "2px solid #FFCC80", borderBottom: "4px solid #FF9600", borderRadius: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: "#FFE0B2", flex: "none" }}>
              {icon("flame", 24, "#FF9600")}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#C2410C" }}>
                Your {state.streak}-day streak is on the line.
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#8A5A2B" }}>
                Lock in today's case before the clock runs out — <b style={{ fontVariantNumeric: "tabular-nums" }}>{countdownText}</b> left.
              </div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ padding: "7px 13px", borderRadius: 11, background: "#58CC02", color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: ".04em" }}>
            DAILY CASE {state.caseNo ? `#${state.caseNo}` : ""}
          </span>
          <span style={{ padding: "7px 13px", borderRadius: 11, background: "#fff", border: "2px solid #E4EAD8", color: "#7C8470", fontWeight: 700, fontSize: 12, letterSpacing: ".03em" }}>
            {state.category}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 11, background: "#fff", border: "2px solid #E4EAD8", color: "#7C8470", fontWeight: 700, fontSize: 12 }}>
            {icon("clock", 16, "#7C8470")}
            {countdownText}
          </span>
        </div>

        <h1 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: "clamp(28px,3.6vw,42px)", lineHeight: 1.1, color: "#3C3C46", letterSpacing: "-.01em", textWrap: "balance" as CSSProperties["textWrap"] }}>
          {state.question}
        </h1>

        {state.alreadyPlayed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "13px 16px", background: state.win ? "#F1FCE6" : "#F4F8EE", border: "2px solid " + (state.win ? "#C4E89E" : "#E4EAD8"), borderRadius: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, flex: "none" }}>
              <Mascot size={52} mood={state.win ? "happy" : "soft"} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#3C3C46" }}>You've already played today's case.</div>
              <div style={{ fontSize: 14, color: "#5E6553", fontWeight: 600 }}>
                Here's how it went — your answer's locked in. The next case lands in {countdownText}.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "13px 16px", background: "#FFFBF0", border: "2px solid #FFE9A0", borderRadius: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, flex: "none", animation: "qbob 3s ease-in-out infinite" }}>
              <Mascot size={52} mood="neutral" />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#3C3C46" }}>Hey — I'm Arbi, and I'm judging today's case.</div>
              <div style={{ fontSize: 14, color: "#7A6540", fontWeight: 600 }}>
                Four answers, one's the sharpest. Back the one you'd defend and see if we land in the same place.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fit,minmax(220px,1fr))" : "1fr 1fr", gap: 16, marginTop: 20 }}>
          {cards.map((card) => (
            <AnswerCard key={card.id} card={card} onSelect={() => onSelectCard(card.id)} />
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          {state.phase === "unvoted" && (
            <>
              <WagerPanel state={state} onSetConfidence={onSetConfidence} onSetCrowdGuess={onSetCrowdGuess} />
              <LockButton state={state} onLockIn={onLockIn} />
              {state.voteError && (
                <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, background: "#FFF3E0", border: "2px solid #FFCC80", color: "#C2410C", fontWeight: 800, fontSize: 13, textAlign: "center" }}>
                  {state.voteError}
                </div>
              )}
              {!isMobile && !state.voteError && (
                <div style={{ marginTop: 9, textAlign: "center", fontWeight: 700, fontSize: 12, color: "#9AA08C" }}>
                  Tip: press <b>1–4</b> to pick · <b>Enter</b> to lock in
                </div>
              )}
            </>
          )}

          {state.phase === "voting" && (
            <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: 18, background: "#fff", border: "2px solid #E4EAD8", borderRadius: 18 }}>
              <span aria-hidden="true" style={{ position: "relative", display: "inline-block", width: 30, height: 30, animation: "qspin .8s linear infinite" }}>
                {spinnerTicks.map((tick, i) => (
                  <span key={i} style={tick.style} />
                ))}
              </span>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#7C8470" }}>Give me a second — I'm weighing them up…</span>
            </div>
          )}

          {state.reveal.verdict && (
            <div
              role="status"
              aria-live="polite"
              style={{
                padding: "18px 20px",
                borderRadius: 20,
                background: state.win ? "#E8FFD7" : "#FFF3E0",
                border: "2px solid " + (state.win ? "#A5ED6E" : "#FFCC80"),
                borderBottom: "4px solid " + (state.win ? "#58CC02" : "#FF9600"),
                animation: "qrise .45s ease both",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: "50%", background: "#fff", flex: "none", animation: "qpop .5s ease both" }}>
                  <Mascot size={50} mood={state.win ? "happy" : "soft"} />
                </span>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div ref={verdictHeadingRef} tabIndex={-1} style={{ outline: "none", fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 23, color: resultAccent }}>
                    {state.win ? "We agree!" : "Not this time"}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#5E6553" }}>
                    {state.win
                      ? "Great read — I went with " + jName(state) + " (" + jPick(state) + ") too. That is exactly how I saw it."
                      : "I went with " +
                        jName(state) +
                        " (" +
                        jPick(state) +
                        ") on this one." +
                        (your ? " You backed " + your.name + " — I get the logic, it just didn't win me over." : "")}
                  </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 24, color: resultAccent }}>
                      +{state.earned}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: ".1em", color: "#9AA08C" }}>{state.alreadyPlayed ? "XP EARNED" : "XP"}</div>
                  </div>
                  {/* CONTINUE only exists to surface the promotion overlay; the
                      result itself now stays on this page, so a played case is
                      never a dead-end. */}
                  {state.promoted && !state.completed && !state.alreadyPlayed && (
                    <ContinueButton state={state} onAdvance={onAdvance} />
                  )}
                </div>
              </div>
              <VerdictBoard state={state} />
              {challenge && challenge.case_no === state.caseNo && (
                <ChallengeOutcome
                  challenge={challenge}
                  yourLetter={your?.letter ?? null}
                  judgeLetter={state.cards.find((c) => c.id === state.judgeCardId)?.letter ?? null}
                />
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 14, paddingTop: 14, borderTop: "2px dashed rgba(0,0,0,.08)" }}>
                {rewardChipsView(state).map((chip, i) => (
                  <span key={i} style={chip.style}>
                    {chip.iconEl}
                    {chip.label}
                  </span>
                ))}
                {state.crowdGuess && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, fontWeight: 800, fontSize: 12,
                    background: state.crowdCorrect ? "#E3F6FF" : "#F4F1EC", color: state.crowdCorrect ? "#1899D6" : "#9A8E7C" }}>
                    {icon("users", 16, state.crowdCorrect ? "#1899D6" : "#9A8E7C")}
                    {state.crowdCorrect ? `Called the crowd  +${state.crowdBonus}` : "Missed the crowd"}
                  </span>
                )}
              </div>

              {state.judgeReasoning && (
                <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,.7)", border: "1.5px solid rgba(60,60,70,.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 11, letterSpacing: ".08em", color: "#58A700", marginBottom: 5 }}>
                    {icon("scale", 15, "#58A700")}
                    WHY I PICKED {jName(state).toUpperCase()} ({jPick(state)})
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.6, color: "#5E6553" }}>{state.judgeReasoning}</div>
                </div>
              )}

              <ShareBar state={state} />

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "2px dashed rgba(0,0,0,.08)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#5E6553" }}>
                  You're all done for today. Next case in{" "}
                  <b style={{ color: "#58A700", fontVariantNumeric: "tabular-nums" }}>{countdownText}</b>.
                </div>
                {canReplay && (
                  <button onClick={onReplay} style={{ fontWeight: 800, fontSize: 13, color: "#8E9582", cursor: "pointer", background: "none", border: "none", fontFamily: "'Nunito',sans-serif" }}>
                    Replay today's case
                  </button>
                )}
              </div>

              <NazarbanCard />
            </div>
          )}
        </div>
      </main>

      {/* GAME RAIL */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <section style={{ background: "#F5FFF0", border: "2px solid #D4F0B0", borderRadius: 20, padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, background: "#FFF3E0", flex: "none" }}>
              {icon("flame", 30, "#FF9600")}
            </span>
            <div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 26, color: "#FF9600", lineHeight: 1 }}>{state.streak}</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#8E9582" }}>day streak</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginTop: 16 }}>
            {weekDays.map((day, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 11, color: "#B2B7A6" }}>{day.letter}</span>
                <span style={day.style}>{day.iconEl}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46" }}>
              {icon("target", 20, "#58CC02")}Daily Goal
            </h2>
            <span style={{ fontWeight: 800, fontSize: 13, color: state.dailyXp >= state.dailyGoal ? "#58A700" : "#9AA08C" }}>
              {Math.round(state.displayDaily)} / {state.dailyGoal} XP
            </span>
          </div>
          <div style={{ height: 14, borderRadius: 999, background: "#EEF1E6", overflow: "hidden", marginTop: 12 }}>
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                width: Math.min(100, (state.displayDaily / state.dailyGoal) * 100) + "%",
                background: "linear-gradient(90deg,#58CC02,#46A302)",
                transition: "width .12s linear",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "2px solid #F0F2EA" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 13, color: "#7C8470" }}>
              {icon("star", 19, "#CE82FF")}Level {state.level}
            </span>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#9AA08C" }}>{state.totalXp.toLocaleString()} XP</span>
          </div>
        </section>

        <section style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h2 style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46" }}>
              {icon("trophy", 22, "#1CB0F6")}Leaderboard
            </h2>
            {state.globalRank != null && <span style={{ fontWeight: 800, fontSize: 12, color: "#1899D6" }}>You're #{state.globalRank.toLocaleString()}</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#8E9582", marginBottom: 8 }}>Top players by total XP</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {leagueRows.map((row, i) => (
              <div key={i}>
                {row.promoLineBefore && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                    <div style={{ flex: 1, height: 2, background: "repeating-linear-gradient(90deg,#A5ED6E 0 7px,transparent 7px 13px)" }} />
                    <span style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: ".1em", color: "#58A700" }}>PROMOTION</span>
                    <div style={{ flex: 1, height: 2, background: "repeating-linear-gradient(90deg,#A5ED6E 0 7px,transparent 7px 13px)" }} />
                  </div>
                )}
                <div style={row.style}>
                  <span style={{ width: 20, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 14, color: row.rankColor, textAlign: "center" }}>{row.rank}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: row.color, color: "#fff", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 13, flex: "none" }}>
                    {row.initial}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#3C3C46", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.name}
                    {row.isBot && <span role="img" aria-label="AI opponent" title="AI opponent" style={{ marginLeft: 5 }}>🤖</span>}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#8E9582" }}>{row.xp}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46" }}>Achievements</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {badges.map((b, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, textAlign: "center" }}>
                <span style={b.iconWrap}>
                  {b.iconEl}
                  {b.showCount && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: -3,
                        right: -3,
                        minWidth: 20,
                        height: 20,
                        padding: "0 4px",
                        borderRadius: 999,
                        background: "#fff",
                        border: "2px solid " + b.ring,
                        color: b.ring,
                        fontWeight: 800,
                        fontSize: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {b.count}
                    </span>
                  )}
                </span>
                <span style={{ fontWeight: 800, fontSize: 11, color: b.labelColor, lineHeight: 1.15 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

// `style-active` (:active pseudo-class) from the original template is reproduced
// here with plain inline styles + mouse handlers toggling a local "pressed" flag.
function LockButton({ state, onLockIn }: { state: GameState; onLockIn: () => void }) {
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={onLockIn}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onMouseLeave={() => setActive(false)}
      style={{ ...lockStyle(state), ...(active ? lockActiveStyle(state) : {}) }}
    >
      {state.selected ? "Lock in your answer" : "Pick an answer first"}
    </button>
  );
}

// Confidence wager + beat-the-crowd side-bet, shown before lock-in.
const CONFIDENCE_OPTS: { id: Confidence; label: string; hint: string; tint: string; bg: string; hoverBg: string; hoverBorder: string }[] = [
  { id: "low",  label: "Safe",     hint: "+30 / +10", tint: "#1899D6", bg: "#E3F6FF", hoverBg: "#F0FAFF", hoverBorder: "#9ACCE8" },
  { id: "med",  label: "Balanced", hint: "+50 / +5",  tint: "#58A700", bg: "#E8FFD7", hoverBg: "#F2FFE8", hoverBorder: "#A8D88C" },
  { id: "high", label: "Bold",     hint: "+100 / 0",  tint: "#E07F00", bg: "#FFF3E0", hoverBg: "#FFF8F0", hoverBorder: "#E8C088" },
];

function WagerPanel({ state, onSetConfidence, onSetCrowdGuess }: {
  state: GameState;
  onSetConfidence: (c: Confidence) => void;
  onSetCrowdGuess: (id: CardId) => void;
}) {
  const [hoverConf, setHoverConf] = useState<Confidence | null>(null);
  const [hoverCrowd, setHoverCrowd] = useState<CardId | null>(null);

  return (
    <div style={{ marginBottom: 14, padding: 16, background: "#fff", border: "2px solid #E4EAD8", borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 12, letterSpacing: ".04em", color: "#7C8470", marginBottom: 9 }}>
        {icon("scale", 16, "#58A700")} HOW SURE ARE YOU?
        <span style={{ fontWeight: 700, color: "#9AA08C", textTransform: "none", letterSpacing: 0 }}>· correct / wrong</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {CONFIDENCE_OPTS.map((o) => {
          const on = state.confidence === o.id;
          const hov = hoverConf === o.id && !on;
          return (
            <button key={o.id} onClick={() => onSetConfidence(o.id)} aria-pressed={on}
              aria-label={`Confidence: ${o.label} (${o.hint} correct / wrong)`}
              onMouseEnter={() => setHoverConf(o.id)}
              onMouseLeave={() => setHoverConf(null)}
              style={{ cursor: "pointer", padding: "10px 6px", borderRadius: 13, textAlign: "center",
                border: "2px solid " + (on ? o.tint : hov ? o.hoverBorder : "#E4EAD8"),
                background: on ? o.bg : hov ? o.hoverBg : "#fff",
                transition: "background .15s,border-color .15s" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: on ? o.tint : hov ? o.tint : "#5E6553" }}>{o.label}</div>
              <div style={{ fontWeight: 800, fontSize: 11, color: on ? o.tint : hov ? o.tint : "#7C8470", marginTop: 2 }}>{o.hint}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 12, letterSpacing: ".04em", color: "#7C8470", margin: "14px 0 9px" }}>
        {icon("users", 16, "#1899D6")} WHO WILL THE CROWD BACK?
        <span style={{ fontWeight: 700, color: "#9AA08C", textTransform: "none", letterSpacing: 0 }}>· optional, +15</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {state.cards.map((c) => {
          const on = state.crowdGuess === c.id;
          const hov = hoverCrowd === c.id && !on;
          return (
            <button key={c.id} onClick={() => onSetCrowdGuess(c.id)} aria-pressed={on}
              aria-label={`Crowd will back ${c.letter}`}
              onMouseEnter={() => setHoverCrowd(c.id)}
              onMouseLeave={() => setHoverCrowd(null)}
              style={{ cursor: "pointer", padding: "10px 6px", borderRadius: 13, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16,
                border: "2px solid " + (on ? "#1899D6" : hov ? "#9ACCE8" : "#E4EAD8"),
                background: on ? "#E3F6FF" : hov ? "#F0FAFF" : "#fff",
                color: on ? "#1899D6" : hov ? "#1899D6" : "#5E6553",
                transition: "background .15s,border-color .15s,color .15s" }}>
              {c.letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Sharing is image-only: every entry point sends the rendered result card (no
// caption text). On mobile the native share sheet attaches the PNG and the user
// picks the app; on desktop the PNG is saved and the chosen app is opened so
// they can attach it.
const SHARE_TARGETS: { platform: SharePlatform; label: string; color: string; iconName: string }[] = [
  { platform: "whatsapp",  label: "WhatsApp",  color: "#25D366", iconName: "whatsapp" },
  { platform: "telegram",  label: "Telegram",  color: "#229ED9", iconName: "telegram" },
  { platform: "instagram", label: "Instagram", color: "#E1306C", iconName: "instagram" },
  { platform: "email",     label: "Email",     color: "#7A8270", iconName: "mail" },
];

function ShareBar({ state, align = "left" }: { state: GameState; align?: "left" | "center" }) {
  const [imgLabel, setImgLabel] = useState("Share image");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400); }

  // "Challenge a friend" — mint a shareable link whose preview is personalised
  // by the `challenge` edge function. This is a LINK share (text + url), unlike
  // the image-only result share below.
  const [chLink, setChLink] = useState<string | null>(null);
  const [chBlob, setChBlob] = useState<Blob | null>(null);
  const [chBusy, setChBusy] = useState(false);
  const [chCopied, setChCopied] = useState(false);

  async function onChallenge() {
    if (chBusy) return;
    if (chLink) {
      const r = await shareChallengeLink(chLink, chBlob);
      if (r === "shared") flash("Challenge sent!");
      else if (r === "copied") { setChCopied(true); setTimeout(() => setChCopied(false), 1800); }
      return;
    }
    setChBusy(true);
    setToast("Creating challenge…");
    const minted = await createChallenge(state);
    setChBusy(false);
    setToast(null);
    if (!minted) { flash("Couldn't create the challenge link"); return; }
    setChLink(minted.url);
    setChBlob(minted.cardBlob);
    const r = await shareChallengeLink(minted.url, minted.cardBlob);
    if (r === "shared") flash("Challenge sent!");
    else if (r === "copied") flash("Link copied — send it to a friend");
  }

  async function onCopyChallenge() {
    if (!chLink) return;
    try { await navigator.clipboard.writeText(chLink); setChCopied(true); setTimeout(() => setChCopied(false), 1800); } catch { /* ignore */ }
  }

  async function onShareImage() {
    if (busy) return;
    setBusy(true);
    setImgLabel("Creating…");
    const r = await shareResultImage(state);
    setImgLabel(r === "shared" ? "Shared!" : r === "downloaded" ? "Image saved" : r === "error" ? "Couldn't create" : "Share image");
    setTimeout(() => setImgLabel("Share image"), 2200);
    setBusy(false);
  }

  async function onPlatform(p: SharePlatform, label: string) {
    if (busy) return;
    setBusy(true);
    setToast("Creating image…");
    const r = await shareResultImage(state, p);
    setBusy(false);
    if (r === "shared") flash("Shared!");
    else if (r === "downloaded") flash(`Image saved — attach it in ${label}`);
    else if (r === "error") flash("Couldn't create the image");
    else setToast(null); // cancelled
  }

  const round = (bg: string): CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 42, height: 42, borderRadius: 12, background: bg, border: "none",
    borderBottom: "3px solid rgba(0,0,0,.18)", cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.6 : 1,
  });

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16, alignItems: align === "center" ? "center" : "flex-start" }}>
      {/* Challenge a friend — the viral loop */}
      <div style={{ width: "100%", maxWidth: 540, padding: "14px 16px", background: "#F5FFF0", border: "2px solid #C4E89E", borderRadius: 16, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 14, color: "#3C3C46" }}>
          <span aria-hidden="true">⚔️</span> Challenge a friend
        </div>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: "#7C8470", marginTop: 4, marginBottom: 11 }}>
          Sends Arbi and the case as an image — with a link to out-judge the judge.
        </div>
        {!chLink ? (
          <button onClick={onChallenge} disabled={chBusy}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: chBusy ? "default" : "pointer",
              border: "2px solid #A5ED6E", borderBottomWidth: 4, background: "#58CC02", color: "#fff", opacity: chBusy ? 0.7 : 1,
              padding: "11px 20px", borderRadius: 14, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14 }}>
            {chBusy ? "Creating…" : "Create challenge link"}
          </button>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input readOnly value={chLink} onFocus={(e) => e.currentTarget.select()} aria-label="Challenge link"
              style={{ flex: "1 1 220px", minWidth: 0, padding: "10px 12px", borderRadius: 12, border: "2px solid #E4EAD8", background: "#fff", color: "#5E6553", fontWeight: 700, fontSize: 13, fontFamily: "'Nunito',sans-serif" }} />
            <button onClick={onCopyChallenge}
              style={{ cursor: "pointer", border: "2px solid #E4EAD8", borderBottomWidth: 4, background: "#fff", color: "#46A302", padding: "10px 16px", borderRadius: 12, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13 }}>
              {chCopied ? "Copied!" : "Copy"}
            </button>
            <button onClick={onChallenge}
              style={{ cursor: "pointer", border: "2px solid #A5ED6E", borderBottomWidth: 4, background: "#58CC02", color: "#fff", padding: "10px 16px", borderRadius: 12, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13 }}>
              Share
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start" }}>
        <button onClick={onShareImage} disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: busy ? "default" : "pointer",
            border: "2px solid #A5ED6E", borderBottomWidth: 4, background: "#58CC02", color: "#fff", opacity: busy ? 0.7 : 1,
            padding: "11px 20px", borderRadius: 14, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-4.5-4.5L7 21" />
          </svg>
          {imgLabel}
        </button>
        {SHARE_TARGETS.map((t) => (
          <button key={t.platform} onClick={() => onPlatform(t.platform, t.label)} disabled={busy}
            title={`Share image to ${t.label}`} aria-label={`Share image to ${t.label}`} style={round(t.color)}>
            {icon(t.iconName, 20, "#fff")}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#9AA08C" }}>
        Shares the result card as an image — no caption text.
      </div>
      {toast && <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1899D6" }}>{toast}</div>}
    </div>
  );
}

// Punchy three-way summary of the reveal — You vs Arbi vs the Crowd — so the
// payoff reads at a glance: who you backed, who Arbi backed, who the crowd did.
function VerdictBoard({ state }: { state: GameState }) {
  const your = state.cards.find((c) => c.id === state.selected);
  const judge = state.cards.find((c) => c.id === state.judgeCardId);
  const crowd = state.cards.find((c) => c.id === state.crowdLeaderId);
  if (!your || !judge) return null;
  const youMatched = your.id === judge.id;
  const crowdMatched = !!crowd && crowd.id === judge.id;
  const crowdPct = crowd ? Math.round((state.displayPct as any)[crowd.id] ?? crowd.crowd ?? 0) : 0;

  const Tile = ({ label, letter, sub, accent, ring, tick }: { label: string; letter: string; sub: string; accent: string; ring: string; tick?: boolean }) => (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "12px 6px", borderRadius: 14, background: "#fff", border: `2px solid ${ring}` }}>
      <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: ".1em", color: "#9AA08C", marginBottom: 7 }}>{label}</div>
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: "50%", background: accent, color: "#fff", fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 19 }}>
        {letter}
        {tick && (
          <span style={{ position: "absolute", bottom: -3, right: -3, width: 19, height: 19, borderRadius: "50%", background: "#58CC02", border: "2px solid #fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            {icon("check", 12, "#fff", 3)}
          </span>
        )}
      </span>
      <div style={{ fontWeight: 800, fontSize: 11.5, color: "#5E6553", marginTop: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginTop: 14 }}>
      <Tile label="YOU" letter={your.letter} sub={your.name} accent={COLORS[your.letter]} ring={youMatched ? "#A5ED6E" : "#FFCC80"} tick={youMatched} />
      <Tile label="ARBI" letter={judge.letter} sub={judge.name} accent="#58CC02" ring="#A5ED6E" tick />
      <Tile label="CROWD" letter={crowd ? crowd.letter : "—"} sub={crowd ? `${crowdPct}% backed` : "—"} accent="#1CB0F6" ring={crowdMatched ? "#A5ED6E" : "#BEEAFD"} tick={crowdMatched} />
    </div>
  );
}

function ContinueButton({ state, onAdvance }: { state: GameState; onAdvance: () => void }) {
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={onAdvance}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onMouseLeave={() => setActive(false)}
      style={{ ...continueStyle(state), ...(active ? continueActiveStyle(state) : {}) }}
    >
      CONTINUE
    </button>
  );
}

// Soft, brand-first bridge to the parent studio, shown only once the case is
// done (the daily ritual is over, so it never competes with the case). Arbi
// introduces Nazarban so the trust the game earns carries across — awareness,
// not a hard sell.
function NazarbanCard() {
  return (
    <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", background: "#F5FFF0", border: "2px solid #D4F0B0", borderRadius: 16 }}>
      <span style={{ flex: "none" }}><Mascot size={44} mood="happy" /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#3C3C46" }}>Made by Nazarban</div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#6E7563", lineHeight: 1.45 }}>
          Quorum is one of the things we build. Come see what else.
        </div>
      </div>
      <a
        href={nazarbanUrl("postgame_card")}
        target="_blank"
        rel="noopener noreferrer"
        style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12, background: "#fff", border: "2px solid #C4E89E", borderBottomWidth: 3, color: "#46A302", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, textDecoration: "none" }}
      >
        Explore →
      </a>
    </div>
  );
}

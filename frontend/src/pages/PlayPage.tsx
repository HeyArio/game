import { useState, type CSSProperties } from "react";
import { Mascot } from "../components/Mascot";
import { AnswerCard } from "../components/AnswerCard";
import { icon } from "../icons/Icon";
import { useIsMobile } from "../hooks/useMediaQuery";
import { shareResult, shareLinks, copyShareText } from "../lib/share";
import type { GameState, CardId, Confidence } from "../state/types";
import {
  badgesView,
  continueActiveStyle,
  continueStyle,
  doneView,
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
  caseLoading?: boolean;
  noCase?: boolean;
  onSelectCard: (id: CardId) => void;
  onSetConfidence: (c: Confidence) => void;
  onSetCrowdGuess: (id: CardId) => void;
  onLockIn: () => void;
  onAdvance: () => void;
  onReplay: () => void;
}

export function PlayPage({ state, countdownText, caseLoading, noCase, onSelectCard, onSetConfidence, onSetCrowdGuess, onLockIn, onAdvance, onReplay }: PlayPageProps) {
  const isMobile = useIsMobile();
  const cards = viewCards(state);
  const your = yourCard(state);
  const resultAccent = state.win ? "#58A700" : "#F57C00";
  const done = doneView(state);
  const weekDays = weekDaysView(state);
  const leagueRows = leagueRowsView(state);
  const badges = badgesView(state, state.stats);

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

  if (state.completed) {
    return (
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "26px 24px" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "32px 28px",
            background: "#fff",
            border: "2px solid #E4EAD8",
            borderBottomWidth: "4px",
            borderRadius: 24,
            textAlign: "center",
            animation: "qrise .45s ease both",
            maxWidth: 700,
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", animation: "qbob 3s ease-in-out infinite" }}>
            <Mascot size={72} mood={done.arbiMood} />
          </div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 29, color: "#3C3C46", letterSpacing: "-.01em", marginTop: 8 }}>
            Today's case is closed
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#8E9582", marginTop: 5 }}>The next case enters the docket in</div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginTop: 14,
              padding: "11px 22px",
              borderRadius: 16,
              background: "#F4F8EE",
              border: "2px solid #E4EAD8",
              fontFamily: "'Baloo 2',cursive",
              fontWeight: 800,
              fontSize: 31,
              color: "#58A700",
              letterSpacing: ".05em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {countdownText}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, marginTop: 20 }}>
            {done.chips.map((chip, i) => (
              <span key={i} style={chip.style}>
                {chip.iconEl}
                {chip.label}
              </span>
            ))}
          </div>
          <div style={{ maxWidth: 430, margin: "18px auto 0", paddingTop: 18, borderTop: "2px dashed #ECEFE4", fontSize: 14.5, fontWeight: 600, color: "#5E6553", lineHeight: 1.5 }}>
            {done.note}
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ShareBar state={state} align="center" />
          </div>
          <div onClick={onReplay} style={{ display: "inline-block", marginTop: 14, fontWeight: 800, fontSize: 13, color: "#B2B7A6", cursor: "pointer" }}>
            Replay today's case
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        padding: isMobile ? "18px 14px" : "26px 24px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 330px",
        gap: isMobile ? 18 : 24,
        alignItems: "start",
      }}
    >
      {/* MAIN COLUMN */}
      <main>
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

        <h1 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: "clamp(28px,3.6vw,42px)", lineHeight: 1.12, color: "#3C3C46", letterSpacing: "-.01em" }}>
          {state.question}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, padding: "13px 16px", background: "#fff", border: "2px solid #E4EAD8", borderRadius: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, flex: "none", animation: "qbob 3s ease-in-out infinite" }}>
            <Mascot size={52} mood="neutral" />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#3C3C46" }}>Hey — I'm Arbi, and I'm judging today's case.</div>
            <div style={{ fontSize: 13, color: "#8E9582", fontWeight: 600 }}>
              Four answers, one's the sharpest. Back the one you'd defend and see if we land in the same place.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fit,minmax(220px,1fr))" : "1fr 1fr", gap: 14, marginTop: 18 }}>
          {cards.map((card) => (
            <AnswerCard key={card.id} card={card} onSelect={() => onSelectCard(card.id)} />
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          {state.phase === "unvoted" && (
            <>
              <WagerPanel state={state} onSetConfidence={onSetConfidence} onSetCrowdGuess={onSetCrowdGuess} />
              <LockButton state={state} onLockIn={onLockIn} />
            </>
          )}

          {state.phase === "voting" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: 18, background: "#fff", border: "2px solid #E4EAD8", borderRadius: 18 }}>
              <span style={{ position: "relative", display: "inline-block", width: 30, height: 30, animation: "qspin .8s linear infinite" }}>
                {spinnerTicks.map((tick, i) => (
                  <span key={i} style={tick.style} />
                ))}
              </span>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#7C8470" }}>Give me a second — I'm weighing them up…</span>
            </div>
          )}

          {state.reveal.verdict && (
            <div
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
                  <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 23, color: resultAccent }}>
                    {state.win ? "We agree!" : "Not this time"}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#5E6553" }}>
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
                    <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: ".1em", color: "#9AA08C" }}>XP</div>
                  </div>
                  <ContinueButton state={state} onAdvance={onAdvance} />
                </div>
              </div>
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
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.5, color: "#5E6553" }}>{state.judgeReasoning}</div>
                </div>
              )}

              <ShareBar state={state} />
            </div>
          )}
        </div>
      </main>

      {/* GAME RAIL */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <section style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 18 }}>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46" }}>
              {icon("target", 20, "#58CC02")}Daily Goal
            </span>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46" }}>
              {icon("trophy", 22, "#1CB0F6")}Leaderboard
            </span>
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
                    {row.isBot && <span title="AI opponent" style={{ marginLeft: 5 }}>🤖</span>}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#8E9582" }}>{row.xp}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46" }}>Achievements</span>
            <span style={{ fontWeight: 800, fontSize: 12, color: "#1CB0F6" }}>See all</span>
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
const CONFIDENCE_OPTS: { id: Confidence; label: string; hint: string; tint: string; bg: string }[] = [
  { id: "low",  label: "Safe",     hint: "+30 / +10", tint: "#1899D6", bg: "#E3F6FF" },
  { id: "med",  label: "Balanced", hint: "+50 / +5",  tint: "#58A700", bg: "#E8FFD7" },
  { id: "high", label: "Bold",     hint: "+100 / 0",  tint: "#E07F00", bg: "#FFF3E0" },
];

function WagerPanel({ state, onSetConfidence, onSetCrowdGuess }: {
  state: GameState;
  onSetConfidence: (c: Confidence) => void;
  onSetCrowdGuess: (id: CardId) => void;
}) {
  return (
    <div style={{ marginBottom: 14, padding: 16, background: "#fff", border: "2px solid #E4EAD8", borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 12, letterSpacing: ".04em", color: "#7C8470", marginBottom: 9 }}>
        {icon("scale", 16, "#58A700")} HOW SURE ARE YOU?
        <span style={{ fontWeight: 700, color: "#B2B7A6", textTransform: "none", letterSpacing: 0 }}>· correct / wrong</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {CONFIDENCE_OPTS.map((o) => {
          const on = state.confidence === o.id;
          return (
            <button key={o.id} onClick={() => onSetConfidence(o.id)}
              style={{ cursor: "pointer", padding: "10px 6px", borderRadius: 13, textAlign: "center",
                border: "2px solid " + (on ? o.tint : "#E4EAD8"), background: on ? o.bg : "#fff",
                transition: "background .15s,border-color .15s" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: on ? o.tint : "#5E6553" }}>{o.label}</div>
              <div style={{ fontWeight: 800, fontSize: 11, color: on ? o.tint : "#9AA08C", marginTop: 2 }}>{o.hint}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 12, letterSpacing: ".04em", color: "#7C8470", margin: "14px 0 9px" }}>
        {icon("users", 16, "#1899D6")} WHO WILL THE CROWD BACK?
        <span style={{ fontWeight: 700, color: "#B2B7A6", textTransform: "none", letterSpacing: 0 }}>· optional, +15</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {state.cards.map((c) => {
          const on = state.crowdGuess === c.id;
          return (
            <button key={c.id} onClick={() => onSetCrowdGuess(c.id)}
              style={{ cursor: "pointer", padding: "10px 6px", borderRadius: 13, fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16,
                border: "2px solid " + (on ? "#1899D6" : "#E4EAD8"), background: on ? "#E3F6FF" : "#fff", color: on ? "#1899D6" : "#7C8470",
                transition: "background .15s,border-color .15s" }}>
              {c.letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShareBar({ state, align = "left" }: { state: GameState; align?: "left" | "center" }) {
  const [label, setLabel] = useState("Share result");
  const [toast, setToast] = useState<string | null>(null);
  const links = shareLinks(state);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2000); }

  async function onShare() {
    const r = await shareResult(state);
    if (r === "copied") { setLabel("Copied!"); setTimeout(() => setLabel("Share result"), 1800); }
    else if (r === "error") { setLabel("Couldn't share"); setTimeout(() => setLabel("Share result"), 1800); }
  }

  async function onInstagram() {
    // Instagram has no web share URL for text, so copy the caption and open it.
    const ok = await copyShareText(state);
    flash(ok ? "Caption copied — paste it into Instagram" : "Couldn't copy caption");
    window.open("https://www.instagram.com/", "_blank", "noopener");
  }

  const round = (bg: string): CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 42, height: 42, borderRadius: 12, background: bg, border: "none",
    borderBottom: "3px solid rgba(0,0,0,.18)", cursor: "pointer", textDecoration: "none",
  });

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 11, alignItems: align === "center" ? "center" : "flex-start" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start" }}>
        <button onClick={onShare}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
            border: "2px solid #BEEAFD", borderBottomWidth: 4, background: "#E3F6FF", color: "#1899D6",
            padding: "11px 20px", borderRadius: 14, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14 }}>
          {icon("share", 17, "#1899D6")}
          {label}
        </button>
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" aria-label="Share on WhatsApp" style={round("#25D366")}>
          {icon("whatsapp", 20, "#fff")}
        </a>
        <a href={links.telegram} target="_blank" rel="noopener noreferrer" title="Share on Telegram" aria-label="Share on Telegram" style={round("#229ED9")}>
          {icon("telegram", 20, "#fff")}
        </a>
        <button onClick={onInstagram} title="Share on Instagram" aria-label="Share on Instagram" style={round("#E1306C")}>
          {icon("instagram", 20, "#fff")}
        </button>
        <a href={links.email} title="Share via email" aria-label="Share via email" style={round("#7A8270")}>
          {icon("mail", 20, "#fff")}
        </a>
      </div>
      {toast && <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1899D6" }}>{toast}</div>}
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

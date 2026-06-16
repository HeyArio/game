import { useState } from "react";
import { Mascot } from "../components/Mascot";
import { AnswerCard } from "../components/AnswerCard";
import { icon } from "../icons/Icon";
import type { GameState, CardId } from "../state/types";
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
  onSelectCard: (id: CardId) => void;
  onLockIn: () => void;
  onAdvance: () => void;
  onReplay: () => void;
}

export function PlayPage({ state, countdownText, onSelectCard, onLockIn, onAdvance, onReplay }: PlayPageProps) {
  const cards = viewCards(state);
  const win = state.selected === "d";
  const your = yourCard(state);
  const resultAccent = state.win ? "#58A700" : "#F57C00";
  const done = doneView(state);
  const weekDays = weekDaysView(state);
  const leagueRows = leagueRowsView(state);
  const badges = badgesView(state);

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
          <div onClick={onReplay} style={{ display: "inline-block", marginTop: 16, fontWeight: 800, fontSize: 13, color: "#B2B7A6", cursor: "pointer" }}>
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
        padding: "26px 24px",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 330px",
        gap: 24,
        alignItems: "start",
      }}
    >
      {/* MAIN COLUMN */}
      <main>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ padding: "7px 13px", borderRadius: 11, background: "#58CC02", color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: ".04em" }}>
            DAILY CASE #218
          </span>
          <span style={{ padding: "7px 13px", borderRadius: 11, background: "#fff", border: "2px solid #E4EAD8", color: "#7C8470", fontWeight: 700, fontSize: 12, letterSpacing: ".03em" }}>
            SPORT · FORECAST
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 11, background: "#fff", border: "2px solid #E4EAD8", color: "#7C8470", fontWeight: 700, fontSize: 12 }}>
            {icon("clock", 16, "#7C8470")}
            06:14
          </span>
        </div>

        <h1 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: "clamp(28px,3.6vw,42px)", lineHeight: 1.12, color: "#3C3C46", letterSpacing: "-.01em" }}>
          Who will win the 2026 World Cup?
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
          {cards.map((card) => (
            <AnswerCard key={card.id} card={card} onSelect={() => onSelectCard(card.id)} />
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          {state.phase === "unvoted" && (
            <LockButton state={state} onLockIn={onLockIn} />
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
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: "50%", background: "#fff", flex: "none", animation: "qpop .5s ease both" }}>
                  <Mascot size={50} mood={state.win ? "happy" : "soft"} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 23, color: resultAccent }}>
                    {state.win ? "We agree!" : "Not this time"}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#5E6553" }}>
                    {state.win
                      ? "Great read — I went with " + jName() + " (" + jPick() + ") too. That is exactly how I saw it."
                      : "I went with " +
                        jName() +
                        " (" +
                        jPick() +
                        ") on this one." +
                        (your ? " You backed " + your.name + " — I get the logic, it just didn't win me over." : "")}
                  </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 24, color: resultAccent }}>
                      +{win ? 50 : 10}
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
              </div>
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
              {icon("star", 19, "#CE82FF")}Level 8
            </span>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#9AA08C" }}>{state.totalXp.toLocaleString()} XP</span>
          </div>
        </section>

        <section style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46" }}>
              {icon("trophy", 22, "#1CB0F6")}Emerald League
            </span>
            <span style={{ fontWeight: 700, fontSize: 11, color: "#B2B7A6" }}>2 days left</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#8E9582", marginBottom: 8 }}>Top 5 advance to Ruby League</div>
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
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#3C3C46", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
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

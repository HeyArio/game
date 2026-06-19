import { Mascot } from "./Mascot";
import { icon } from "../icons/Icon";
import { useFocusTrap } from "../hooks/useFocusTrap";

// A 10-second "here's the loop" for first-time players, so the four-answer
// screen doesn't read as a wall of text on the very first visit. Shown once
// (gated by localStorage in the shell), dismissible, keyboard-accessible.
const STEPS = [
  { ic: "eye",    tint: "#1CB0F6", bg: "#E3F4FF", title: "Read four takes", body: "Four AI models answer one debatable question. Skim the picks — tap “Why this?” for the reasoning." },
  { ic: "scale",  tint: "#CE82FF", bg: "#F4E9FF", title: "Back your pick",  body: "Choose the sharpest answer and set your confidence. On a keyboard: 1–4 to pick, Enter to lock in." },
  { ic: "trophy", tint: "#FF9600", bg: "#FFF3E0", title: "Beat the judge",  body: "Arbi reveals its verdict. Match it to earn XP, build a streak, and climb the leagues." },
] as const;

export function OnboardingOverlay({ onDone }: { onDone: () => void }) {
  const trapRef = useFocusTrap();
  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ob-title"
      onKeyDown={(e) => { if (e.key === "Escape") onDone(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, background: "rgba(30,40,20,.55)", backdropFilter: "blur(4px)", animation: "qfade .25s ease both",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 24, border: "2px solid #E4EAD8", borderBottomWidth: 4, padding: "28px 24px", animation: "qrise .4s ease both" }}>
        <div style={{ display: "flex", justifyContent: "center", animation: "qbob 3s ease-in-out infinite" }}><Mascot size={60} mood="happy" /></div>
        <h2 id="ob-title" style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 24, color: "#3C3C46", textAlign: "center", margin: "10px 0 4px" }}>How Quorum works</h2>
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: 14, color: "#7C8470", margin: "0 0 18px" }}>Two minutes. One sharp call. Here's the loop:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 13, background: s.bg, flex: "none" }}>
                {icon(s.ic, 22, s.tint)}
                <span style={{ position: "absolute", top: -6, left: -6, width: 20, height: 20, borderRadius: "50%", background: "#3C3C46", color: "#fff", fontWeight: 800, fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#3C3C46" }}>{s.title}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "#5E6553", lineHeight: 1.5, marginTop: 2 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onDone}
          style={{ width: "100%", marginTop: 22, border: "none", cursor: "pointer", padding: "15px", borderRadius: 15, background: "#58CC02", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15.5, letterSpacing: ".02em", boxShadow: "0 4px 0 #46A302" }}
        >
          Got it — let's play
        </button>
      </div>
    </div>
  );
}

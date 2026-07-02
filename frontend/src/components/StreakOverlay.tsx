import { Mascot } from "./Mascot";
import { icon } from "../icons/Icon";
import type { GameState } from "../state/types";
import { useFocusTrap } from "../hooks/useFocusTrap";

export interface StreakOverlayProps {
  state: GameState;
  countdownText: string;
  onClose: () => void;
}

export function StreakOverlay({ state, countdownText, onClose }: StreakOverlayProps) {
  const trapRef = useFocusTrap();
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(40,44,32,.5)",
        backdropFilter: "blur(6px)",
        animation: "qfade .2s ease both",
      }}
    >
      <div
        ref={trapRef}
        onClick={stop}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-dialog-title"
        style={{
          width: "min(432px,100%)",
          background: "#fff",
          borderRadius: 26,
          border: "2px solid #EFE2CC",
          boxShadow: "0 20px 50px rgba(60,40,0,.25)",
          overflow: "hidden",
          animation: "qrise .4s ease both",
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "30px 26px 22px",
            textAlign: "center",
            background: "radial-gradient(120% 100% at 50% -10%, #FFE6BE 0%, #FFF4E2 65%)",
            borderBottom: "2px solid #FBE3BE",
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 10,
              background: "rgba(255,255,255,.7)",
              border: "none",
              color: "#B79A6B",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 74,
              height: 74,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 4px 0 #F0C98A,inset 0 0 0 2px #FFE0B2",
              animation: "qbob 3s ease-in-out infinite",
            }}
          >
            {icon("flame", 38, "#FF9600")}
          </div>
          <div id="streak-dialog-title" style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 25, color: "#3C3C46", marginTop: 12, lineHeight: 1.12 }}>
            Your {state.streak}-day streak is on the line
          </div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "#9A7B4C", marginTop: 5, lineHeight: 1.5 }}>
            Leave today's case unjudged and it resets to zero.
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 13,
              padding: "7px 14px",
              borderRadius: 999,
              background: "#fff",
              border: "2px solid #FBE3BE",
              color: "#E07F00",
              fontWeight: 800,
              fontSize: 13,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Resets in {countdownText}
          </div>
        </div>
        <div style={{ padding: "20px 22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 16,
              borderRadius: 18,
              background: "#F4FBEC",
              border: "2px solid #D7EEC0",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#fff",
                border: "2px solid #D7EEC0",
                flex: "none",
              }}
            >
              {icon("shield", 24, "#58A700")}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46" }}>
                Continuance · {state.contLeft} left
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#7C8470", lineHeight: 1.5 }}>
                {state.contLeft > 0
                  ? "Miss a day and one is used automatically — your streak holds. Even judges grant a recess."
                  : "None left — a missed day now resets your streak."}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 14px", borderRadius: 13, background: "#FFF8E1", border: "2px solid #FFECB3", fontWeight: 700, fontSize: 13, color: "#8A6D1F", lineHeight: 1.45 }}>
            {icon("bolt", 16, "#E5A300")}
            <span>Earn a new Continuance every 7-day streak milestone (you can hold up to 3).</span>
          </div>
          <button onClick={onClose} style={{ display: "block", width: "100%", textAlign: "center", marginTop: 14, fontWeight: 800, fontSize: 13, color: "#8E9582", background: "none", border: "none", cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>
            I'll defend it live →
          </button>
        </div>
      </div>
    </div>
  );
}

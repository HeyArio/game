import { Mascot } from "./Mascot";
import { icon } from "../icons/Icon";
import type { GameState } from "../state/types";
import { useFocusTrap } from "../hooks/useFocusTrap";

export interface StreakOverlayProps {
  state: GameState;
  countdownText: string;
  onClose: () => void;
  onEquip: () => void;
}

export function StreakOverlay({ state, countdownText, onClose, onEquip }: StreakOverlayProps) {
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
          {!state.contEquipped && (
            <>
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
                    Hold your streak through one missed day. Even judges grant a recess.
                  </div>
                </div>
              </div>
              <button
                onClick={onEquip}
                style={{
                  width: "100%",
                  marginTop: 14,
                  border: "none",
                  cursor: "pointer",
                  padding: 15,
                  borderRadius: 15,
                  fontFamily: "'Nunito',sans-serif",
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: ".03em",
                  textTransform: "uppercase",
                  color: "#fff",
                  background: "#58CC02",
                  boxShadow: "0 4px 0 #46A302",
                }}
              >
                Equip a Continuance
              </button>
              <button onClick={onClose} style={{ display: "block", width: "100%", textAlign: "center", marginTop: 12, fontWeight: 800, fontSize: 13, color: "#8E9582", background: "none", border: "none", cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>
                I'll defend it live →
              </button>
            </>
          )}
          {state.contEquipped && (
            <div style={{ textAlign: "center", padding: "8px 4px", animation: "qpop .4s ease both" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "#58CC02",
                  boxShadow: "0 4px 0 #46A302",
                }}
              >
                {icon("check", 26, "#fff", 2.8)}
              </div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 20, color: "#58A700", marginTop: 12 }}>
                Continuance equipped
              </div>
              <div style={{ fontWeight: 600, fontSize: 14.5, color: "#7C8470", marginTop: 3, lineHeight: 1.55 }}>
                Your streak holds through one missed day. {state.contLeft} continuance remaining.
              </div>
              <button
                onClick={onClose}
                style={{
                  marginTop: 16,
                  border: "none",
                  cursor: "pointer",
                  padding: "13px 26px",
                  borderRadius: 14,
                  fontFamily: "'Nunito',sans-serif",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#fff",
                  background: "#58CC02",
                  boxShadow: "0 4px 0 #46A302",
                }}
              >
                Back to the case
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

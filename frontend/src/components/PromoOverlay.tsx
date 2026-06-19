import { Mascot } from "./Mascot";
import { icon } from "../icons/Icon";
import { useFocusTrap } from "../hooks/useFocusTrap";

export interface PromoOverlayProps {
  onDismiss: () => void;
  /** The league tier the player is now in — themes the whole celebration. */
  tierName?: string;
  tierColor?: string;
}

// Mix a hex toward white (amt>0) or black (amt<0) so we can theme the overlay
// from a single tier colour without per-tier palettes.
function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const target = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((target - r) * p + r);
  g = Math.round((target - g) * p + g);
  b = Math.round((target - b) * p + b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function PromoOverlay({ onDismiss, tierName = "a new", tierColor = "#E23B3B" }: PromoOverlayProps) {
  const trapRef = useFocusTrap();
  const light = shadeHex(tierColor, 0.32);
  const dark = shadeHex(tierColor, -0.42);
  const darker = shadeHex(tierColor, -0.58);
  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-dialog-title"
      onKeyDown={(e) => { if (e.key === "Escape") onDismiss(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: `radial-gradient(120% 90% at 50% 8%, ${light} 0%, ${tierColor} 52%, ${darker} 100%)`,
        animation: "qfade .25s ease both",
      }}
    >
      <div style={{ position: "relative", textAlign: "center", color: "#fff", maxWidth: 460, animation: "qrise .5s ease both" }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: ".2em", color: "#FFD9A0" }}>LEAGUE PROMOTION</div>
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 124, height: 124, marginTop: 16 }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(255,255,255,.14)" }} />
          <span style={{ position: "absolute", inset: 15, borderRadius: "50%", background: "rgba(255,255,255,.12)" }} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: "linear-gradient(160deg,#FFE49A,#F4B33C)",
              boxShadow: "0 6px 0 #C98A1E,0 0 38px rgba(255,210,120,.6)",
            }}
          >
            {icon("crown", 42, "#fff")}
          </span>
        </div>
        <div id="promo-dialog-title" style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 46, lineHeight: 1, marginTop: 16, textShadow: "0 3px 0 rgba(0,0,0,.18)" }}>
          {tierName} League
        </div>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 22, marginTop: 14 }}>You've been elevated</div>
        <div style={{ fontWeight: 700, fontSize: 15, opacity: 0.92, marginTop: 6, lineHeight: 1.5, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
          You've climbed into the {tierName} ranks. Sharper cases, higher stakes, better rewards.
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            marginTop: 20,
            padding: "12px 16px 12px 12px",
            borderRadius: 18,
            background: "rgba(255,255,255,.14)",
            border: "2px solid rgba(255,255,255,.22)",
          }}
        >
          <span style={{ flex: "none" }}>
            <Mascot size={54} mood="happy" />
          </span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: "#FFD9A0", marginBottom: 1 }}>Arbi</div>
            <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.5, maxWidth: 240 }}>
              Knew you had it in you. Don't get comfortable — it only gets sharper from here.
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={onDismiss}
            style={{
              marginTop: 24,
              border: "none",
              cursor: "pointer",
              padding: "16px 40px",
              borderRadius: 16,
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              color: dark,
              background: "#fff",
              boxShadow: "0 5px 0 rgba(0,0,0,.18)",
            }}
          >
            Enter {tierName} League
          </button>
        </div>
      </div>
    </div>
  );
}

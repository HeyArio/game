import { Mascot } from "../components/Mascot";
import { useAuth } from "../auth/AuthProvider";
import { isSupabaseConfigured } from "../lib/supabase";
import { icon } from "../icons/Icon";

// Google "G" mark — official 4-colour glyph, inline so we ship no extra asset.
function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block", flex: "none" }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const FEATURES = [
  { ic: "bolt", tint: "#FF9600", bg: "#FFF3E0", title: "One case a day", body: "A fresh, debatable question every morning — answered by four rival AIs." },
  { ic: "scale", tint: "#1CB0F6", bg: "#E3F4FF", title: "Back the sharpest", body: "Pick the answer you'd defend, then see if you land with Arbi the judge." },
  { ic: "trophy", tint: "#CE82FF", bg: "#F4E9FF", title: "Climb the leagues", body: "Build a streak, earn XP, and rise through weekly leaderboards." },
] as const;

export function SignInPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(120% 70% at 50% -10%, #EAF7DD 0%, #F4F8EE 55%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: 22,
          width: "min(880px, 100%)",
          alignItems: "stretch",
        }}
      >
        {/* LEFT — pitch */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 20,
            padding: "8px 6px",
            animation: "qrise .45s ease both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "#58CC02",
                boxShadow: "0 4px 0 #46A302",
                fontFamily: "'Baloo 2',cursive",
                fontWeight: 800,
                fontSize: 26,
                color: "#fff",
              }}
            >
              Q
            </span>
            <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 32, color: "#58A700" }}>Quorum</span>
          </div>

          <h1
            style={{
              fontFamily: "'Baloo 2',cursive",
              fontWeight: 800,
              fontSize: "clamp(28px, 4.4vw, 40px)",
              lineHeight: 1.12,
              color: "#3C3C46",
              letterSpacing: "-.01em",
              margin: 0,
            }}
          >
            Four AIs answer.<br />You back the&nbsp;sharpest.
          </h1>

          <p style={{ fontWeight: 700, fontSize: 15.5, color: "#7C8470", lineHeight: 1.55, margin: 0 }}>
            Quorum is a daily game of judgment. Read four AI takes on one tough question,
            pick the one you'd stand behind, and see if Arbi agrees.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 2 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: f.bg,
                    flex: "none",
                  }}
                >
                  {icon(f.ic, 22, f.tint)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: "#3C3C46" }}>{f.title}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#8E9582", lineHeight: 1.45 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT — sign-in card */}
        <section
          style={{
            background: "#fff",
            border: "2px solid #E4EAD8",
            borderBottomWidth: 4,
            borderRadius: 26,
            padding: "34px 30px 28px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            animation: "qrise .55s ease both",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", animation: "qbob 3s ease-in-out infinite" }}>
            <Mascot size={88} mood="happy" />
          </div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 23, color: "#3C3C46", marginTop: 14 }}>
            Ready to play?
          </div>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#8E9582", marginTop: 5, lineHeight: 1.5 }}>
            Sign in to start your streak. Today's case is waiting.
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={!isSupabaseConfigured}
            onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            style={{
              width: "100%",
              marginTop: 22,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              border: "2px solid #E4EAD8",
              borderBottomWidth: 4,
              background: "#fff",
              color: "#3C3C46",
              padding: "15px",
              borderRadius: 15,
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 800,
              fontSize: 15.5,
              cursor: isSupabaseConfigured ? "pointer" : "not-allowed",
              opacity: isSupabaseConfigured ? 1 : 0.6,
              transition: "transform .05s",
            }}
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, fontWeight: 700, fontSize: 12, color: "#AEB4A2" }}>
            {icon("shield", 15, "#AEB4A2")}
            No spam — we only use Google to sign you in.
          </div>

          {!isSupabaseConfigured && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "#FFF3E0", border: "2px solid #FFCC80", fontWeight: 700, fontSize: 12.5, color: "#C0392B", lineHeight: 1.5 }}>
              Supabase isn't configured yet. Copy <code>.env.example</code> to <code>.env</code> and add your project URL + anon key.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

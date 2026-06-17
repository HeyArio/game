import type { CSSProperties, ReactNode } from "react";
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

const wordmark = (size = 30, mark = 40) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: mark,
        height: mark,
        borderRadius: mark * 0.32,
        background: "#58CC02",
        boxShadow: "0 4px 0 #46A302",
        fontFamily: "'Baloo 2',cursive",
        fontWeight: 800,
        fontSize: mark * 0.6,
        color: "#fff",
      }}
    >
      Q
    </span>
    <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: size, color: "#58A700" }}>Quorum</span>
  </div>
);

const card: CSSProperties = {
  background: "#fff",
  border: "2px solid #E4EAD8",
  borderBottomWidth: 4,
  borderRadius: 22,
  padding: "24px 22px",
};

function Eyebrow({ children, color = "#58A700", bg = "#E8FFD7" }: { children: string; color?: string; bg?: string }) {
  return (
    <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: 999, background: bg, color, fontWeight: 800, fontSize: 12, letterSpacing: ".06em" }}>
      {children}
    </span>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: "clamp(24px,3.2vw,34px)", lineHeight: 1.15, color: "#3C3C46", letterSpacing: "-.01em", margin: "14px 0 0" }}>
      {children}
    </h2>
  );
}

const HOW = [
  { ic: "eye", tint: "#1CB0F6", bg: "#E3F4FF", title: "Read four takes", body: "Each morning, four leading AI models answer one genuinely debatable question — in their own words." },
  { ic: "scale", tint: "#CE82FF", bg: "#F4E9FF", title: "Back your pick", body: "Decide which answer is the sharpest and most defensible, then lock it in before the case closes." },
  { ic: "trophy", tint: "#FF9600", bg: "#FFF3E0", title: "See the verdict", body: "Arbi, the judge model, reveals its call. Match it to earn XP, build a streak, and climb the leagues." },
] as const;

const BENEFITS = [
  { ic: "cap", tint: "#58CC02", bg: "#E8FFD7", title: "Sharpen your judgment", body: "Practising the daily call trains you to weigh evidence, spot weak reasoning, and commit to a view under uncertainty." },
  { ic: "users", tint: "#1CB0F6", bg: "#E3F4FF", title: "See how AIs actually reason", body: "Watch how different frontier models approach the same question — where they agree, where they diverge, and why." },
  { ic: "flame", tint: "#FF9600", bg: "#FFF3E0", title: "A two-minute daily habit", body: "One sharp question a day. No doomscrolling, no noise — just a quick, satisfying mental rep that compounds." },
  { ic: "medal", tint: "#CE82FF", bg: "#F4E9FF", title: "Compete with friends", body: "Streaks, XP, weekly leagues, and achievements turn good thinking into a game you'll want to keep winning." },
] as const;

const USES = [
  { ic: "target", title: "Settle a debate", body: "Use the daily case as a neutral prompt to argue with friends, colleagues, or your group chat." },
  { ic: "calendar", title: "Start a standup", body: "A fast, fun icebreaker for teams — vote together and compare your read against the judge." },
  { ic: "star", title: "Train your instincts", body: "Forecasters, analysts, and the merely curious use it to keep their decision-making sharp." },
] as const;

const STATS = [
  { value: "4", label: "AI models, every day" },
  { value: "1", label: "question that matters" },
  { value: "2 min", label: "to play" },
  { value: "∞", label: "bragging rights" },
] as const;

export function SignInPage() {
  const { signInWithGoogle } = useAuth();

  const CTA = ({ wide = false }: { wide?: boolean }) => (
    <button
      onClick={signInWithGoogle}
      disabled={!isSupabaseConfigured}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: wide ? "100%" : "auto",
        border: "none",
        background: "#58CC02",
        color: "#fff",
        padding: "15px 26px",
        borderRadius: 15,
        fontFamily: "'Nunito',sans-serif",
        fontWeight: 800,
        fontSize: 15.5,
        letterSpacing: ".01em",
        boxShadow: "0 4px 0 #46A302",
        cursor: isSupabaseConfigured ? "pointer" : "not-allowed",
        opacity: isSupabaseConfigured ? 1 : 0.6,
        transition: "transform .05s",
      }}
    >
      <span style={{ background: "#fff", borderRadius: 6, padding: 3, display: "inline-flex" }}><GoogleMark size={18} /></span>
      Continue with Google
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(120% 60% at 50% -8%, #EAF7DD 0%, #F4F8EE 52%)" }}>
      {/* NAV */}
      <header style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {wordmark(26, 38)}
        <button
          onClick={signInWithGoogle}
          disabled={!isSupabaseConfigured}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            border: "2px solid #E4EAD8", borderBottomWidth: 3, background: "#fff", color: "#3C3C46",
            padding: "9px 16px", borderRadius: 12, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14,
            cursor: isSupabaseConfigured ? "pointer" : "not-allowed", opacity: isSupabaseConfigured ? 1 : 0.6,
          }}
        >
          <GoogleMark size={16} /> Sign in
        </button>
      </header>

      {/* HERO */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 8px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 30, alignItems: "center" }}>
        <div style={{ animation: "qrise .5s ease both" }}>
          <Eyebrow>A NEW CASE EVERY DAY</Eyebrow>
          <h1 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: "clamp(32px,5vw,52px)", lineHeight: 1.08, color: "#3C3C46", letterSpacing: "-.02em", margin: "16px 0 0" }}>
            Four AIs answer.<br />You back the sharpest.
          </h1>
          <p style={{ fontWeight: 700, fontSize: 16.5, color: "#7C8470", lineHeight: 1.55, margin: "16px 0 0", maxWidth: 480 }}>
            Quorum is a daily game of judgment. Read four AI takes on one tough question,
            pick the one you'd stand behind, and see if the judge agrees. Two minutes a day to
            keep your thinking sharp.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 24 }}>
            <CTA />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 13, color: "#9AA08C" }}>
              {icon("shield", 16, "#9AA08C")} Free · No credit card
            </span>
          </div>
        </div>

        {/* Hero visual — a mini mock of a case */}
        <div style={{ ...card, padding: "20px 20px 22px", animation: "qrise .6s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "none", animation: "qbob 3s ease-in-out infinite" }}><Mascot size={44} mood="happy" /></span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 11, letterSpacing: ".06em", color: "#58A700" }}>DAILY CASE · TECHNOLOGY</div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 17, color: "#3C3C46", lineHeight: 1.2 }}>Will AI replace natural talent in pro sport?</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 14 }}>
            {[
              { l: "A", c: "#58CC02", n: "GPT-OSS 120B", p: "No — talent stays" },
              { l: "B", c: "#1CB0F6", n: "Llama 3.3 70B", p: "Yes, eventually", win: true },
              { l: "C", c: "#CE82FF", n: "Mistral Small", p: "No, it amplifies" },
              { l: "D", c: "#FF9600", n: "Gemini Flash", p: "Yes — it shifts" },
            ].map((o) => (
              <div key={o.l} style={{ position: "relative", padding: "10px 11px", borderRadius: 13, background: o.win ? "#E8FFD7" : "#F7F9F2", border: "2px solid " + (o.win ? "#A5ED6E" : "#ECEFE4") }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 7, background: o.c, color: "#fff", fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 12 }}>{o.l}</span>
                  <span style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: ".04em", color: "#9AA08C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.n}</span>
                  {o.win && <span style={{ marginLeft: "auto", flex: "none" }}>{icon("check", 14, "#58A700", 3)}</span>}
                </div>
                <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 13, color: "#3C3C46", marginTop: 6 }}>{o.p}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 13, padding: "9px 12px", borderRadius: 12, background: "#FFF8E1" }}>
            {icon("scale", 17, "#E5A300")}
            <span style={{ fontWeight: 700, fontSize: 12.5, color: "#9A7B00" }}>Arbi backed <b>B</b> — match the judge to earn +50 XP.</span>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
        <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, padding: "18px 10px" }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: "center", padding: "4px 6px" }}>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 30, color: "#58A700", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "#8E9582", marginTop: 5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px", textAlign: "center" }}>
        <Eyebrow color="#1899D6" bg="#E3F4FF">HOW IT WORKS</Eyebrow>
        <H2>Three steps, two minutes</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16, marginTop: 24, textAlign: "left" }}>
          {HOW.map((h, i) => (
            <div key={h.title} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 14, background: h.bg, flex: "none" }}>{icon(h.ic, 24, h.tint)}</span>
                <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 28, color: "#E4EAD8" }}>{i + 1}</span>
              </div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 19, color: "#3C3C46", marginTop: 14 }}>{h.title}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#8E9582", lineHeight: 1.55, marginTop: 6 }}>{h.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px", textAlign: "center" }}>
        <Eyebrow color="#58A700">WHY QUORUM</Eyebrow>
        <H2>It's a workout for your judgment</H2>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#8E9582", maxWidth: 560, margin: "12px auto 0", lineHeight: 1.55 }}>
          Anyone can have an opinion. Quorum rewards the discipline of picking the <i>best</i> one — and shows you how the smartest models in the world reason about the same problem.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16, marginTop: 24, textAlign: "left" }}>
          {BENEFITS.map((b) => (
            <div key={b.title} style={card}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 14, background: b.bg }}>{icon(b.ic, 24, b.tint)}</span>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 18, color: "#3C3C46", marginTop: 12 }}>{b.title}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#8E9582", lineHeight: 1.55, marginTop: 6 }}>{b.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px", textAlign: "center" }}>
        <Eyebrow color="#B45CF0" bg="#F4E9FF">WAYS TO PLAY</Eyebrow>
        <H2>More than a daily puzzle</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, marginTop: 24, textAlign: "left" }}>
          {USES.map((u) => (
            <div key={u.title} style={{ ...card, display: "flex", gap: 13, alignItems: "flex-start" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: "#F4F8EE", flex: "none" }}>{icon(u.ic, 21, "#58A700")}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15.5, color: "#3C3C46" }}>{u.title}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "#8E9582", lineHeight: 1.5, marginTop: 3 }}>{u.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 40px" }}>
        <div style={{ ...card, background: "linear-gradient(135deg,#58CC02,#46A302)", border: "none", textAlign: "center", padding: "38px 24px", boxShadow: "0 6px 0 #3E9000" }}>
          <div style={{ display: "flex", justifyContent: "center", animation: "qbob 3s ease-in-out infinite" }}><Mascot size={72} mood="happy" /></div>
          <h2 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: "clamp(24px,3.4vw,32px)", color: "#fff", margin: "12px 0 0" }}>
            Today's case is waiting.
          </h2>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#EAFBD9", margin: "8px auto 0", maxWidth: 420, lineHeight: 1.5 }}>
            Sign in with Google, make your first call, and start a streak you'll want to protect.
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <button
              onClick={signInWithGoogle}
              disabled={!isSupabaseConfigured}
              onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                border: "none", background: "#fff", color: "#3C3C46",
                padding: "15px 28px", borderRadius: 15, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15.5,
                boxShadow: "0 4px 0 #2E7D00", cursor: isSupabaseConfigured ? "pointer" : "not-allowed", opacity: isSupabaseConfigured ? 1 : 0.6,
                transition: "transform .05s",
              }}
            >
              <GoogleMark /> Continue with Google
            </button>
          </div>
          {!isSupabaseConfigured && (
            <div style={{ marginTop: 16, fontWeight: 700, fontSize: 12.5, color: "#fff", opacity: 0.95 }}>
              Supabase isn't configured yet — copy <code>.env.example</code> to <code>.env</code> and add your project URL + anon key.
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "2px solid #E4EAD8", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          {wordmark(20, 30)}
          <div style={{ fontWeight: 700, fontSize: 13, color: "#9AA08C" }}>
            Powered by{" "}
            <a href="https://nazarbanai.com" target="_blank" rel="noopener noreferrer" style={{ color: "#58A700", fontWeight: 800, textDecoration: "none" }}>
              nazarbanai.com
            </a>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: "#B2B7A6" }}>© {new Date().getFullYear()} Quorum</div>
        </div>
      </footer>
    </div>
  );
}

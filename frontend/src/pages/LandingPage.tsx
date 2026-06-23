import { type CSSProperties, type ReactNode } from "react";
import { Mascot } from "../components/Mascot";
import { useAuth } from "../auth/AuthProvider";
import { isSupabaseConfigured } from "../lib/supabase";
import { nazarbanUrl } from "../lib/nazarban";
import { feedbackHref, feedbackIsExternal } from "../lib/feedback";
import { icon } from "../icons/Icon";

// Google "G" mark — official 4-colour glyph, inline so we ship no extra asset.
function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block", flex: "none" }} aria-hidden="true">
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
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: mark, height: mark, borderRadius: mark * 0.32,
        background: "#58CC02", boxShadow: "0 4px 0 #46A302",
        fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: mark * 0.6, color: "#fff",
      }}
    >
      Q
    </span>
    <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: size, color: "#4A9600" }}>Quorum</span>
  </div>
);

const card: CSSProperties = {
  background: "#fff", border: "2px solid #E4EAD8", borderBottomWidth: 4,
  borderRadius: 22, padding: "24px 22px",
};

function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      style={{
        fontFamily: "'Baloo 2',cursive", fontWeight: 800,
        fontSize: "clamp(24px,3.2vw,34px)", lineHeight: 1.1,
        color: "#3C3C46", letterSpacing: "-.01em",
        margin: 0, scrollMarginTop: 90,
        textWrap: "balance" as CSSProperties["textWrap"],
      }}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Content — kept as data so the visible copy and the structured data stay in
// sync. SEO: descriptive headings + semantic sections. AEO: the FAQ doubles as
// FAQPage JSON-LD. GEO: the "What is Quorum" block states quotable, factual
// claims a generative engine can lift verbatim.
// ---------------------------------------------------------------------------

const HOW = [
  { ic: "eye", tint: "#1CB0F6", bg: "#E3F4FF", numColor: "#B8DCFA", title: "Read four takes", body: "Each morning, four leading AI models answer one genuinely debatable question — in their own words, side by side." },
  { ic: "scale", tint: "#CE82FF", bg: "#F4E9FF", numColor: "#E0C8FC", title: "Back your pick", body: "Decide which answer is the sharpest and most defensible, set your confidence, then lock it in before the case closes." },
  { ic: "trophy", tint: "#FF9600", bg: "#FFF3E0", numColor: "#FFD8A0", title: "See the verdict", body: "Arbi, the judge model, reveals its call. Match it to earn XP, build a streak, and climb the global leagues." },
] as const;

const BENEFITS = [
  { ic: "cap", tint: "#58CC02", bg: "#E8FFD7", title: "Sharpen your judgment", body: "Practising the daily call trains you to weigh evidence, spot weak reasoning, and commit to a view under uncertainty." },
  { ic: "users", tint: "#1CB0F6", bg: "#E3F4FF", title: "See how AIs actually reason", body: "Watch how different frontier models approach the same question — where they agree, where they diverge, and why." },
  { ic: "flame", tint: "#FF9600", bg: "#FFF3E0", title: "A two-minute daily habit", body: "One sharp question a day: no doomscrolling, no noise, just a quick mental rep that compounds over time." },
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

// Sample categories of the daily case — pure content for SEO/topical coverage.
const CATEGORIES = [
  { ic: "trendUp", color: "#FF9600", bg: "#FFF3E0", name: "Sports & forecasting", q: "Who wins the next World Cup — and why?" },
  { ic: "gem",     color: "#1CB0F6", bg: "#E3F4FF", name: "Science & tech", q: "Will fusion power reach the grid before 2040?" },
  { ic: "cap",     color: "#CE82FF", bg: "#F4E9FF", name: "History & culture", q: "Which invention reshaped the world the most?" },
  { ic: "target",  color: "#58CC02", bg: "#E8FFD7", name: "Strategy & business", q: "Should a startup raise now or stay lean?" },
  { ic: "face",    color: "#FF9600", bg: "#FFF3E0", name: "Ethics & society", q: "When is it right to break a small rule for a big good?" },
  { ic: "star",    color: "#CE82FF", bg: "#F4E9FF", name: "Everyday dilemmas", q: "Is it better to rent or buy in a hot market?" },
] as const;

const MODELS = [
  { letter: "A", color: "#58CC02", bg: "#F2FFEC", border: "#C4E89E", name: "GPT-class" },
  { letter: "B", color: "#1CB0F6", bg: "#EBF8FF", border: "#A8D9F5", name: "Llama-class" },
  { letter: "C", color: "#CE82FF", bg: "#F8EEFF", border: "#DFBEFF", name: "Mistral-class" },
  { letter: "D", color: "#FF9600", bg: "#FFF8EE", border: "#FFD599", name: "Gemini-class" },
] as const;

// AEO: these power both the visible FAQ and the FAQPage structured data.
const FAQ = [
  {
    q: "What is Quorum?",
    a: "Quorum is a free daily game where four leading AI models answer the same debatable question, and you decide which answer is the sharpest. An impartial judge model then reveals its verdict — match it to earn XP and grow your streak. It takes about two minutes a day.",
  },
  {
    q: "How do you play Quorum?",
    a: "Read the four AI answers to today's question, pick the one you'd stand behind, set your confidence, and lock it in before the case closes. The judge model reveals its call, and you score points for matching it. A new case drops every day.",
  },
  {
    q: "Is Quorum free to play?",
    a: "Yes. Quorum is completely free, with no credit card required. Sign in with Google to save your streak, XP, and league standing across devices.",
  },
  {
    q: "Which AI models does Quorum use?",
    a: "Each daily case is answered by four different frontier AI models — drawn from families such as GPT, Llama, Mistral, and Gemini — and adjudicated by a separate judge model nicknamed Arbi, so no single model is both contestant and referee.",
  },
  {
    q: "How is the winning answer decided?",
    a: "An independent judge model reads the four answers and picks the one it finds most defensible. You score points when your pick matches the judge's verdict. You can also predict which answer the crowd will favour for a bonus.",
  },
  {
    q: "How long does a game take?",
    a: "About two minutes. Quorum is designed as a quick daily ritual — one sharp question a day — rather than something you binge.",
  },
  {
    q: "Do I need an account?",
    a: "You can preview today's case without an account. To lock in answers, keep a streak, earn XP, and appear on the leagues, sign in for free with Google.",
  },
  {
    q: "What makes Quorum different from a quiz?",
    a: "A quiz has a single factual answer. Quorum poses genuinely debatable questions where reasoning matters more than recall — you're judging the quality of an argument, not reciting a fact.",
  },
] as const;

export function LandingPage({ onPlay }: { onPlay: () => void }) {
  const { signInWithGoogle } = useAuth();

  // NOTE: the FAQPage structured data now lives statically in index.html (in the
  // ld+json @graph) so non-JS crawlers and answer engines can read it without
  // executing the app. Keep the two FAQ lists in sync when editing either.

  const PlayCTA = ({ wide = false }: { wide?: boolean }) => (
    <button
      className="lp-btn-play"
      onClick={onPlay}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
        width: wide ? "100%" : "auto", border: "none", background: "#58CC02", color: "#fff",
        padding: "15px 26px", borderRadius: 15, fontFamily: "'Nunito',sans-serif", fontWeight: 800,
        fontSize: 15.5, letterSpacing: ".01em", boxShadow: "0 4px 0 #46A302", cursor: "pointer",
        transition: "transform .05s, background .1s",
      }}
    >
      {icon("play", 18, "#fff")} Play today's case
    </button>
  );

  const SignInButton = ({ subtle = false }: { subtle?: boolean }) => (
    <button
      className={subtle ? "lp-btn-signin-subtle" : undefined}
      onClick={signInWithGoogle}
      disabled={!isSupabaseConfigured}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        border: subtle ? "2px solid #E4EAD8" : "none", borderBottomWidth: subtle ? 3 : undefined,
        background: "#fff", color: "#3C3C46",
        padding: subtle ? "9px 16px" : "14px 22px",
        minHeight: subtle ? 44 : undefined,
        borderRadius: subtle ? 12 : 15,
        fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: subtle ? 14 : 15,
        boxShadow: subtle ? undefined : "0 4px 0 #D9E0CC",
        cursor: isSupabaseConfigured ? "pointer" : "not-allowed", opacity: isSupabaseConfigured ? 1 : 0.6,
        transition: "background .1s, border-color .1s",
      }}
    >
      <GoogleMark size={subtle ? 16 : 18} /> {subtle ? "Sign in" : "Sign in with Google"}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(120% 60% at 50% -8%, #EAF7DD 0%, #F4F8EE 52%)" }}>
      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(244,248,238,.9)", backdropFilter: "blur(10px)", borderBottom: "2px solid #E4EAD8" }}>
        <nav aria-label="Primary" style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          {wordmark(24, 36)}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "none", gap: 20, alignItems: "center" }} className="lp-navlinks">
              <a href="#how" style={navLink}>How it works</a>
              <a href="#why" style={navLink}>Why Quorum</a>
              <a href="#faq" style={navLink}>FAQ</a>
            </div>
            <SignInButton subtle />
          </div>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(56px,8vw,96px) 24px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 30, alignItems: "center" }}>
          <div style={{ animation: "qrise .5s ease both" }}>
            <h1 style={{
              fontFamily: "'Baloo 2',cursive", fontWeight: 800,
              fontSize: "clamp(32px,5vw,52px)", lineHeight: 1.08,
              color: "#3C3C46", letterSpacing: "-.02em", margin: 0,
              textWrap: "balance" as CSSProperties["textWrap"],
            }}>
              Four AIs answer.<br />You back the sharpest.
            </h1>
            <p style={{ fontWeight: 700, fontSize: 16.5, color: "#5E6654", lineHeight: 1.55, margin: "16px 0 0", maxWidth: 480 }}>
              Quorum is the daily game of judgment. Read four AI takes on one tough question,
              pick the one you'd stand behind, and see if the judge agrees. Two minutes a day to
              keep your thinking sharp.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 24 }}>
              <PlayCTA />
              <SignInButton />
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 13, color: "#5E6654", marginTop: 16 }}>
              {icon("shield", 16, "#5E6654")} Free · No credit card · New case daily
            </span>
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

        {/* FACT STRIP — inline stats, no hero-metric template */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px 80px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: 32, rowGap: 10, padding: "16px 0", borderTop: "2px solid #E4EAD8", borderBottom: "2px solid #E4EAD8" }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 20, color: "#4A9600" }}>{s.value}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#5E6654" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* WHAT IS QUORUM — GEO: concise, quotable, factual */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 96px" }}>
          <div style={{ ...card, padding: "44px 40px", background: "linear-gradient(180deg,#FFFFFF,#FBFEF6)" }}>
            <H2>The daily game where you judge AI</H2>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#5E6654", lineHeight: 1.65, margin: "16px 0 0", maxWidth: 760 }}>
              <b>Quorum is a free daily browser game in which four leading AI models answer the same
              debatable question and you decide which answer is the most defensible.</b> An impartial
              judge model then reveals its verdict. You score points for matching the judge, predicting
              the crowd, and keeping a daily streak alive. There is one new case every day, and a round
              takes about two minutes.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 28, marginTop: 32 }}>
              {[
                { t: "A game of judgment, not trivia", b: "Questions are genuinely debatable. You're rating the strength of an argument, not recalling a fact." },
                { t: "Four contestants, one judge", b: "Four frontier models answer; a separate judge model, Arbi, decides — so no model grades its own work." },
                { t: "Two minutes, every day", b: "A fast, repeatable ritual that builds the habit of weighing evidence and committing to a call." },
              ].map((x) => (
                <div key={x.t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    flex: "none", display: "inline-flex", width: 24, height: 24,
                    alignItems: "center", justifyContent: "center",
                    borderRadius: 8, background: "#E8FFD7", marginTop: 1,
                  }}>
                    {icon("check", 13, "#58A700")}
                  </span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#3C3C46" }}>{x.t}</div>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "#5E6654", lineHeight: 1.6, marginTop: 4 }}>{x.b}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — step numbers as visual anchors, no eyebrow */}
        <section id="how" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 88px", scrollMarginTop: 80 }}>
          <H2>Three steps, two minutes</H2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, marginTop: 36, textAlign: "left" }}>
            {HOW.map((h, i) => (
              <article key={h.title} style={{ ...card, position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", top: -16, right: 10,
                  fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 96,
                  color: h.numColor, lineHeight: 1, userSelect: "none", pointerEvents: "none",
                }}>
                  {i + 1}
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 46, height: 46, borderRadius: 14, background: h.bg, flex: "none", position: "relative",
                }}>
                  {icon(h.ic, 24, h.tint)}
                </span>
                <h3 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 19, color: "#3C3C46", marginTop: 14, position: "relative" }}>{h.title}</h3>
                <p style={{ fontWeight: 600, fontSize: 15, color: "#5E6654", lineHeight: 1.6, marginTop: 6, position: "relative" }}>{h.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* MEET THE MODELS */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 72px", textAlign: "center" }}>
          <H2>Four answers in, one judge out</H2>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#5E6654", maxWidth: 600, margin: "14px auto 0", lineHeight: 1.55 }}>
            Every case fields four anonymised frontier models as contestants and a separate model as
            the judge. Identities stay hidden until the reveal, so you score the argument, not the brand.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginTop: 32 }}>
            {MODELS.map((m) => (
              <div key={m.letter} style={{ ...card, background: m.bg, border: `2px solid ${m.border}`, borderBottomWidth: 4, textAlign: "center", padding: "20px 14px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 14, background: m.color, color: "#fff", fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 24, boxShadow: `0 3px 0 rgba(0,0,0,.18)` }}>{m.letter}</span>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#3C3C46", marginTop: 12 }}>{m.name}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#5E6654", marginTop: 2 }}>Contestant</div>
              </div>
            ))}
          </div>
          <div style={{ ...card, display: "inline-flex", alignItems: "center", gap: 14, marginTop: 16, padding: "16px 22px", textAlign: "left", background: "#FFF8E1", border: "2px solid #FFECB3" }}>
            <span style={{ flex: "none" }}><Mascot size={40} mood="neutral" /></span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: "#3C3C46" }}>Meet Arbi, the judge</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#7A5F00", marginTop: 2 }}>An independent model that reads all four answers and calls the most defensible one.</div>
            </div>
          </div>
        </section>

        {/* BENEFITS — horizontal item list, no eyebrow, no card grid */}
        <section id="why" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 104px", scrollMarginTop: 80 }}>
          <H2>It's a workout for your judgment</H2>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#5E6654", maxWidth: 560, margin: "14px 0 0", lineHeight: 1.55 }}>
            Anyone can have an opinion. Quorum rewards the discipline of picking the <i>best</i> one, and shows you how frontier models reason about the same question.
          </p>
          <div style={{ marginTop: 36, borderTop: "2px solid #E4EAD8" }}>
            {BENEFITS.map((b) => (
              <article
                key={b.title}
                style={{
                  display: "flex", gap: 22, padding: "28px 0",
                  borderBottom: "2px solid #E4EAD8", alignItems: "flex-start",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 48, height: 48, borderRadius: 14, background: b.bg, flex: "none",
                }}>
                  {icon(b.ic, 24, b.tint)}
                </span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 18, color: "#3C3C46" }}>{b.title}</h3>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "#5E6654", lineHeight: 1.6, marginTop: 6, maxWidth: 580 }}>{b.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* SAMPLE CATEGORIES */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 88px" }}>
          <H2>One case a day, across every domain</H2>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#5E6654", maxWidth: 560, margin: "14px 0 0", lineHeight: 1.55 }}>
            From sports forecasts to ethics, science to strategy: if smart people can disagree about it, it can become a Quorum case.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginTop: 32 }}>
            {CATEGORIES.map((c) => (
              <div key={c.name} style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: c.bg, flex: "none" }}>{icon(c.ic, 21, c.color)}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: ".03em", color: "#5E6654", textTransform: "uppercase" }}>{c.name}</div>
                  <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, color: "#3C3C46", marginTop: 4, lineHeight: 1.25 }}>"{c.q}"</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* USE CASES — stacked strips, no eyebrow, no card grid */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
          <H2>More than a daily puzzle</H2>
          <div style={{ marginTop: 32, background: "#fff", border: "2px solid #E4EAD8", borderBottomWidth: 4, borderRadius: 22, overflow: "hidden" }}>
            {USES.map((u, i) => (
              <article
                key={u.title}
                style={{
                  display: "flex", gap: 20, padding: "24px 28px",
                  borderTop: i > 0 ? "2px solid #EEF1E6" : undefined,
                  alignItems: "flex-start",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 44, height: 44, borderRadius: 13, background: "#F4F8EE", flex: "none",
                }}>
                  {icon(u.ic, 22, "#58A700")}
                </span>
                <div>
                  <h3 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 16, color: "#3C3C46" }}>{u.title}</h3>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "#5E6654", lineHeight: 1.6, marginTop: 4 }}>{u.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ — AEO */}
        <section id="faq" style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px 96px", scrollMarginTop: 80 }}>
          <H2>Questions, answered</H2>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ.map((f) => (
              <details key={f.q} style={{ ...card, padding: 0, overflow: "hidden" }}>
                <summary style={{ listStyle: "none", cursor: "pointer", padding: "18px 20px", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16.5, color: "#3C3C46", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  {f.q}
                  <svg className="faq-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58A700" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", transition: "transform .2s" }} aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p style={{ padding: "0 20px 20px", fontWeight: 600, fontSize: 15, color: "#6E7563", lineHeight: 1.65, margin: 0 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ ...card, background: "linear-gradient(135deg,#58CC02,#46A302)", border: "none", textAlign: "center", padding: "56px 32px", boxShadow: "0 6px 0 #3E9000" }}>
            <div style={{ display: "flex", justifyContent: "center", animation: "qbob 3s ease-in-out infinite" }}><Mascot size={72} mood="happy" /></div>
            <h2 style={{
              fontFamily: "'Baloo 2',cursive", fontWeight: 800,
              fontSize: "clamp(24px,3.4vw,32px)", color: "#fff", margin: "12px 0 0",
              textWrap: "balance" as CSSProperties["textWrap"],
            }}>
              Today's case is waiting.
            </h2>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#EAFBD9", margin: "10px auto 0", maxWidth: 420, lineHeight: 1.5 }}>
              Make your first call, start a streak you'll want to protect, and see how your judgment stacks up against the crowd.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
              <button
                className="lp-btn-play-white"
                onClick={onPlay}
                onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10, border: "none", background: "#fff", color: "#3C3C46",
                  padding: "15px 28px", borderRadius: 15, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15.5,
                  boxShadow: "0 4px 0 #2E7D00", cursor: "pointer", transition: "transform .05s, background .1s",
                }}
              >
                {icon("play", 18, "#3C3C46")} Play today's case
              </button>
              <button
                onClick={signInWithGoogle}
                disabled={!isSupabaseConfigured}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10, border: "2px solid rgba(255,255,255,.6)", background: "transparent", color: "#fff",
                  padding: "15px 26px", borderRadius: 15, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15.5,
                  cursor: isSupabaseConfigured ? "pointer" : "not-allowed", opacity: isSupabaseConfigured ? 1 : 0.6,
                }}
              >
                <span style={{ background: "#fff", borderRadius: 6, padding: 3, display: "inline-flex" }}><GoogleMark size={16} /></span>
                Sign in to save progress
              </button>
            </div>
            {!isSupabaseConfigured && (
              <div style={{ marginTop: 16, fontWeight: 700, fontSize: 12.5, color: "#fff", opacity: 0.95 }}>
                Supabase isn't configured yet — copy <code>.env.example</code> to <code>.env</code> and add your project URL + anon key.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: "2px solid #E4EAD8", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "26px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {wordmark(20, 30)}
          <nav aria-label="Footer" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <a href="#how" style={navLink}>How it works</a>
            <a href="#why" style={navLink}>Why Quorum</a>
            <a href="#faq" style={navLink}>FAQ</a>
            <a href="/privacy.html" style={navLink}>Privacy</a>
            <a href="/terms.html" style={navLink}>Terms</a>
            <a href={feedbackHref()} {...(feedbackIsExternal() ? { target: "_blank", rel: "noopener noreferrer" } : {})} style={navLink}>Feedback</a>
          </nav>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#5E6654" }}>
            <a href={nazarbanUrl("landing_footer")} target="_blank" rel="noopener noreferrer" style={{ color: "#3E7200", fontWeight: 800, textDecoration: "none" }}>
              Built by Nazarban — see what else we make →
            </a>
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#6E7563", flexBasis: "100%" }}>© {new Date().getFullYear()} Quorum · The daily AI judgment game</div>
        </div>
      </footer>
    </div>
  );
}

const navLink: CSSProperties = {
  fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, color: "#5E6654", textDecoration: "none",
};

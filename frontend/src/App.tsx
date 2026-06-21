import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { ConfettiCanvas } from "./components/ConfettiCanvas";
import { PromoOverlay } from "./components/PromoOverlay";
import { StreakOverlay } from "./components/StreakOverlay";
import { TopBar } from "./components/TopBar";
import { SignInOverlay } from "./components/SignInOverlay";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import { Mascot } from "./components/Mascot";
import { useGameState } from "./state/useGameState";

// Route-level code splitting: a guest hitting the landing page shouldn't have to
// download PlayPage (+ its share-card/canvas code) and vice-versa. Each screen
// is its own chunk, loaded on demand behind a Suspense boundary.
const LeaguesPage = lazy(() => import("./pages/LeaguesPage").then((m) => ({ default: m.LeaguesPage })));
const PlayPage = lazy(() => import("./pages/PlayPage").then((m) => ({ default: m.PlayPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const QuestsPage = lazy(() => import("./pages/QuestsPage").then((m) => ({ default: m.QuestsPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })));
import { useDailyCase } from "./hooks/useDailyCase";
import { useIncomingChallenge } from "./lib/challenge";
import { useClientCase } from "./hooks/useClientCase";
import { useVote } from "./hooks/useVote";
import { supabase } from "./lib/supabase";
import { nazarbanUrl } from "./lib/nazarban";
import { isClientLlmEnabled } from "./lib/providers";
import { leagueTier } from "./state/viewHelpers";
import type { CardId, Screen } from "./state/types";

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <SplashScreen />;
  // Logged-out visitors get a read-only preview of today's case (so shared
  // links land on the game, not a wall). Actions prompt sign-in.
  if (!session) return <GuestGame />;
  // TESTING ONLY: if a provider key is in frontend/.env, generate the case in the
  // browser and score locally instead of using the DB + edge functions.
  return isClientLlmEnabled() ? <ClientGame /> : <Game />;
}

function SplashScreen() {
  return (
    <div role="status" aria-label="Loading Quorum" style={{ minHeight: "100vh", background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ animation: "qbob 3s ease-in-out infinite" }}><Mascot size={72} mood="neutral" /></span>
    </div>
  );
}

// Suspense fallback while a lazily-loaded screen chunk arrives. Reserves vertical
// space so switching screens doesn't collapse the layout.
function PageFallback() {
  return (
    <div role="status" aria-label="Loading" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ animation: "qbob 3s ease-in-out infinite" }}><Mascot size={56} mood="neutral" /></span>
    </div>
  );
}

// ---- Production path: case + scoring come from Supabase ----
function Game() {
  const { submitVote } = useVote();
  const { status: caseStatus, dailyCase, error: caseError } = useDailyCase();
  const game = useGameState({
    onSubmitVote: async (caseId, optionId, confidence, crowdGuessOptionId) =>
      submitVote(caseId, optionId, confidence, crowdGuessOptionId),
  });

  useEffect(() => {
    if (caseStatus !== "active" || !dailyCase) return;
    const cards = dailyCase.options.map((opt) => ({
      id: opt.letter.toLowerCase() as CardId, letter: opt.letter, name: opt.model_name,
      pick: opt.pick, crowd: opt.crowd_pct, answer: opt.rationale, _optionId: opt.id,
    }));
    game.actions.initCase({
      caseId: dailyCase.id, question: dailyCase.question, category: dailyCase.category,
      caseNo: dailyCase.case_no, cards, closesAt: dailyCase.closes_at,
    });
  }, [caseStatus, dailyCase]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the player already voted on today's case, drop them straight onto their
  // locked result — no re-voting, no re-scoring, no replayed celebration. (One
  // vote per case per day; the board is read-only afterwards.)
  useEffect(() => {
    if (caseStatus !== "active" || !dailyCase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: existing } = await supabase
          .from("votes")
          .select("option_id")
          .eq("user_id", user.id)
          .eq("case_id", dailyCase.id)
          .maybeSingle();
        if (cancelled || !existing?.option_id) return;
        // Re-derive the full stored verdict (judge pick, reasoning, crowd leader,
        // live %) via the idempotent submit-vote "alreadyVoted" path. Because a
        // vote already exists, this never records a new one.
        const result = await submitVote(dailyCase.id, existing.option_id);
        if (!cancelled && result?.alreadyVoted) game.actions.loadExistingVote(result);
      } catch (e) {
        // Non-fatal: the player just sees a fresh (re-votable) board; the server
        // still rejects a duplicate vote, so progress can't be corrupted.
        if (!cancelled) console.error("[Game] existing-vote load failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [caseStatus, dailyCase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_progress")
        .select("streak, total_xp, daily_xp, continuance_count, best_streak")
        .eq("user_id", user.id).maybeSingle();
      if (data) game.actions.initProgress({
        streak: data.streak ?? 0, totalXp: data.total_xp ?? 0, dailyXp: data.daily_xp ?? 0,
        contLeft: data.continuance_count ?? 2, bestStreak: (data as any).best_streak ?? 0,
      });

      // Real leaderboard — top players by total XP (real users + labeled AI
      // opponents), with the current user flagged.
      const { data: board } = await supabase
        .from("global_leaderboard")
        .select("user_id, display_name, avatar_color, total_xp, is_bot, rank")
        .order("rank", { ascending: true })
        .limit(20);
      if (board?.length) {
        game.actions.initLeague(
          board.map((r: any) => ({
            name: r.user_id === user.id ? "You" : r.display_name,
            initial: (r.display_name?.[0] ?? "?").toUpperCase(),
            color: r.avatar_color ?? "#58CC02",
            xp: r.total_xp ?? 0,
            isYou: r.user_id === user.id,
            isBot: !!r.is_bot,
          }))
        );
      }

      // Real lifetime stats for the Profile + Quests screens.
      const { data: stats } = await supabase.rpc("get_player_stats").single();
      if (stats) game.actions.initStats({
        casesJudged: (stats as any).cases_judged ?? 0,
        correctCount: (stats as any).correct_count ?? 0,
        agreementPct: (stats as any).agreement_pct ?? 0,
        votesThisWeek: (stats as any).votes_this_week ?? 0,
      });

      // The player's real rank across everyone (they're rarely in the top 20).
      const { data: meRow } = await supabase
        .from("global_leaderboard")
        .select("rank")
        .eq("user_id", user.id)
        .maybeSingle();
      game.actions.initRank((meRow as any)?.rank ?? null);
    }).catch((e) => {
      // Non-fatal: the UI keeps its honest defaults (zeros + placeholder bots)
      // rather than crashing on a transient load failure.
      console.error("[Game] progress/leaderboard load failed:", e);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <GameShell game={game} caseLoading={caseStatus === "loading"} noCase={caseStatus === "no_case"} error={caseStatus === "error" ? caseError : null} />;
}

// ---- Testing path: case generated in-browser via LLM providers, scored locally ----
function ClientGame() {
  const { status, clientCase, error } = useClientCase();
  const game = useGameState(); // no onSubmitVote → local scoring against judgeCardId

  useEffect(() => {
    if (status !== "active" || !clientCase) return;
    game.actions.initCase({
      caseId: clientCase.caseId, question: clientCase.question, category: clientCase.category,
      caseNo: clientCase.caseNo, cards: clientCase.cards, closesAt: clientCase.closesAt,
      judgeCardId: clientCase.judgeCardId,
    });
  }, [status, clientCase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dev path has no server vote to lock against, so replaying the locally-scored
  // case is allowed (and useful for testing).
  return <GameShell game={game} caseLoading={status === "loading"} noCase={false} error={status === "error" ? error : null} canReplay />;
}

// ---- Guest path: landing page first, then a read-only preview of today's case ----
function GuestGame() {
  // Logged-out visitors land on the marketing page (the front door). "Play
  // today's case" drops them into the read-only game preview; the top-left logo
  // takes them back to the landing page. Exception: someone arriving on a
  // challenge link (?c=<id>) is dropped straight onto the case so they see the
  // "X challenged you" intro instead of a marketing wall.
  const [view, setView] = useState<"landing" | "game">(() => {
    try { return new URLSearchParams(window.location.search).has("c") ? "game" : "landing"; }
    catch { return "landing"; }
  });
  const { status: caseStatus, dailyCase, error: caseError } = useDailyCase();
  const game = useGameState(); // no onSubmitVote — guests can't score or save

  const goLanding = () => {
    setView("landing");
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (caseStatus !== "active" || !dailyCase) return;
    const cards = dailyCase.options.map((opt) => ({
      id: opt.letter.toLowerCase() as CardId, letter: opt.letter, name: opt.model_name,
      pick: opt.pick, crowd: opt.crowd_pct, answer: opt.rationale, _optionId: opt.id,
    }));
    game.actions.initCase({
      caseId: dailyCase.id, question: dailyCase.question, category: dailyCase.category,
      caseNo: dailyCase.case_no, cards, closesAt: dailyCase.closes_at,
    });
  }, [caseStatus, dailyCase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (view === "landing") return (
    <Suspense fallback={<SplashScreen />}>
      <LandingPage onPlay={() => { setView("game"); window.scrollTo(0, 0); }} />
    </Suspense>
  );

  return (
    <GameShell
      game={game}
      caseLoading={caseStatus === "loading"}
      noCase={caseStatus === "no_case"}
      error={caseStatus === "error" ? caseError : null}
      guest
      // Softer gated actions (other screens) bounce back to the landing page.
      onRequireAuth={() => goLanding()}
      onGoLanding={() => goLanding()}
    />
  );
}

// ---- Shared shell ----
function GameShell({ game, caseLoading, noCase, error, guest = false, canReplay = false, onRequireAuth, onGoLanding }: {
  game: ReturnType<typeof useGameState>;
  caseLoading: boolean;
  noCase: boolean;
  error: string | null;
  guest?: boolean;
  canReplay?: boolean;
  onRequireAuth?: () => void;
  onGoLanding?: () => void;
}) {
  const { state, countdownText, countdownSeconds, setCanvas, actions } = game;
  // A recipient who arrived via a challenge link (?c=<id>) — drives the intro
  // banner and the You-vs-them-vs-Arbi reveal line.
  const challenge = useIncomingChallenge();
  const screenLabel = { play: "Daily Case", leagues: "Leagues", quests: "Quests", profile: "Profile" }[state.screen];
  // When a guest tries to lock in, prompt them to sign in via a modal popup.
  const [signInPrompt, setSignInPrompt] = useState(false);
  // First-run onboarding: shown once to signed-in players (guests already came
  // through the landing page, which explains the game).
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !guest && !localStorage.getItem("quorum_onboarded_v1"); } catch { return false; }
  });

  if (state.screen === "play" && error) return <ErrorScreen message={error} />;

  const requireAuth = () => onRequireAuth?.();
  // In guest mode, committing actions route to sign-in instead of running.
  const selectScreen = guest
    ? (id: Screen) => { if (id === "play") actions.setScreen("play"); else requireAuth(); }
    : actions.setScreen;
  // Guests who try to lock in get a "please sign in" popup; other gated actions
  // fall back to the landing page.
  const lockIn = guest ? () => setSignInPrompt(true) : actions.lockIn;
  const openStreak = guest ? requireAuth : actions.openStreak;
  // Logo target: guests go back to the landing page; signed-in players go home
  // (to the daily case). TopBar also scrolls to top for visible feedback.
  const onHome = guest && onGoLanding ? onGoLanding : () => actions.setScreen("play");

  return (
    <div data-screen-label={screenLabel} style={{ minHeight: "100vh", background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)", color: "#3C3C46", padding: "0 0 60px" }}>
      <TopBar state={state} onSelectScreen={selectScreen} onOpenStreak={openStreak} onHome={onHome} guest={guest} onSignIn={requireAuth} />

      <Suspense fallback={<PageFallback />}>
        {state.screen === "play" && (
          <PlayPage state={state} countdownText={countdownText} countdownSeconds={countdownSeconds} caseLoading={caseLoading} noCase={noCase} canReplay={canReplay} challenge={challenge}
            onSelectCard={actions.selectCard} onSetConfidence={actions.setConfidence} onSetCrowdGuess={actions.setCrowdGuess}
            onLockIn={lockIn} onAdvance={actions.advance} onReplay={actions.reset} />
        )}
        {state.screen === "leagues" && <LeaguesPage state={state} />}
        {state.screen === "quests"  && <QuestsPage  countdownText={countdownText} onClaimed={actions.grantBonusXp} />}
        {state.screen === "profile" && <ProfilePage state={state} />}
      </Suspense>

      {state.overlay === "streak" && (
        <StreakOverlay state={state} countdownText={countdownText} onClose={actions.closeOverlay} onEquip={actions.equipContinuance} />
      )}
      {state.overlay === "promo" && <PromoOverlay onDismiss={actions.dismissPromo} tierName={leagueTier(state.totalXp).name} tierColor={leagueTier(state.totalXp).color} />}

      {signInPrompt && <SignInOverlay onClose={() => setSignInPrompt(false)} />}

      {showOnboarding && state.screen === "play" && (
        <OnboardingOverlay onDone={() => { try { localStorage.setItem("quorum_onboarded_v1", "1"); } catch { /* ignore */ } setShowOnboarding(false); }} />
      )}

      <footer style={{ textAlign: "center", padding: "28px 16px 6px", fontWeight: 700, fontSize: 12, color: "#9AA08C" }}>
        <a href={nazarbanUrl("app_footer")} target="_blank" rel="noopener noreferrer" style={{ color: "#5E6654", fontWeight: 800, textDecoration: "none" }}>
          From the team behind Quorum — see what else we build →
        </a>
      </footer>

      <ConfettiCanvas setCanvas={setCanvas} />
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div role="alert" style={{ padding: "60px 24px", textAlign: "center", color: "#5E6654", fontWeight: 700 }}>
      <Mascot size={64} mood="soft" />
      <div style={{ marginTop: 16, fontSize: 15 }}>{message}</div>
    </div>
  );
}

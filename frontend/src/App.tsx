import { useEffect } from "react";
import { useAuth } from "./auth/AuthProvider";
import { ConfettiCanvas } from "./components/ConfettiCanvas";
import { PromoOverlay } from "./components/PromoOverlay";
import { StreakOverlay } from "./components/StreakOverlay";
import { TopBar } from "./components/TopBar";
import { Mascot } from "./components/Mascot";
import { LeaguesPage } from "./pages/LeaguesPage";
import { PlayPage } from "./pages/PlayPage";
import { ProfilePage } from "./pages/ProfilePage";
import { QuestsPage } from "./pages/QuestsPage";
import { SignInPage } from "./pages/SignInPage";
import { useGameState } from "./state/useGameState";
import { useDailyCase } from "./hooks/useDailyCase";
import { useClientCase } from "./hooks/useClientCase";
import { useVote } from "./hooks/useVote";
import { supabase } from "./lib/supabase";
import { isClientLlmEnabled } from "./lib/providers";
import type { CardId } from "./state/types";

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!session) return <SignInPage />;
  // TESTING ONLY: if a provider key is in frontend/.env, generate the case in the
  // browser and score locally instead of using the DB + edge functions.
  return isClientLlmEnabled() ? <ClientGame /> : <Game />;
}

function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ animation: "qbob 3s ease-in-out infinite" }}><Mascot size={72} mood="neutral" /></span>
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
      caseNo: dailyCase.case_no, cards: cards as any, closesAt: dailyCase.closes_at,
    });
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

  return <GameShell game={game} caseLoading={status === "loading"} noCase={false} error={status === "error" ? error : null} />;
}

// ---- Shared shell ----
function GameShell({ game, caseLoading, noCase, error }: {
  game: ReturnType<typeof useGameState>;
  caseLoading: boolean;
  noCase: boolean;
  error: string | null;
}) {
  const { state, countdownText, setCanvas, actions } = game;
  const screenLabel = { play: "Daily Case", leagues: "Leagues", quests: "Quests", profile: "Profile" }[state.screen];

  if (state.screen === "play" && error) return <ErrorScreen message={error} />;

  return (
    <div data-screen-label={screenLabel} style={{ minHeight: "100vh", background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)", color: "#3C3C46", padding: "0 0 60px" }}>
      <TopBar state={state} onSelectScreen={actions.setScreen} onOpenStreak={actions.openStreak} />

      {state.screen === "play" && (
        <PlayPage state={state} countdownText={countdownText} caseLoading={caseLoading} noCase={noCase}
          onSelectCard={actions.selectCard} onSetConfidence={actions.setConfidence} onSetCrowdGuess={actions.setCrowdGuess}
          onLockIn={actions.lockIn} onAdvance={actions.advance} onReplay={actions.reset} />
      )}
      {state.screen === "leagues" && <LeaguesPage state={state} />}
      {state.screen === "quests"  && <QuestsPage  state={state} />}
      {state.screen === "profile" && <ProfilePage state={state} />}

      {state.overlay === "streak" && (
        <StreakOverlay state={state} countdownText={countdownText} onClose={actions.closeOverlay} onEquip={actions.equipContinuance} />
      )}
      {state.overlay === "promo" && <PromoOverlay onDismiss={actions.dismissPromo} />}

      <ConfettiCanvas setCanvas={setCanvas} />
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: "#8E9582", fontWeight: 700 }}>
      <Mascot size={64} mood="soft" />
      <div style={{ marginTop: 16, fontSize: 15 }}>{message}</div>
    </div>
  );
}

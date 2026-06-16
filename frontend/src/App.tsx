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
import { useVote } from "./hooks/useVote";
import { supabase } from "./lib/supabase";
import type { CardId } from "./state/types";

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!session) return <SignInPage />;
  return <Game />;
}

function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ animation: "qbob 3s ease-in-out infinite" }}><Mascot size={72} mood="neutral" /></span>
    </div>
  );
}

function Game() {
  const { submitVote } = useVote();
  const { status: caseStatus, dailyCase, error: caseError } = useDailyCase();

  const { state, countdownText, setCanvas, actions } = useGameState({
    onSubmitVote: async (caseId, optionId) => submitVote(caseId, optionId),
  });

  // Load case data into game state once fetched
  useEffect(() => {
    if (caseStatus !== "active" || !dailyCase) return;

    // Map DB options to BaseCards (letter → a/b/c/d id, store option id for vote submission)
    const cards = dailyCase.options.map((opt) => ({
      id: opt.letter.toLowerCase() as CardId,
      letter: opt.letter,
      name: opt.model_name,
      pick: opt.pick,
      crowd: opt.crowd_pct,
      answer: opt.rationale,
      _optionId: opt.id,   // carried through so submit-vote can send the right DB id
    }));

    actions.initCase({
      caseId:   dailyCase.id,
      question: dailyCase.question,
      category: dailyCase.category,
      caseNo:   dailyCase.case_no,
      cards:    cards as any,
      closesAt: dailyCase.closes_at,
    });
  }, [caseStatus, dailyCase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load user progress
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_progress")
        .select("streak, total_xp, daily_xp, continuance_count, sharpEye:sharp_eye_count")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        actions.initProgress({
          streak:   data.streak ?? 0,
          totalXp:  data.total_xp ?? 0,
          dailyXp:  data.daily_xp ?? 0,
          contLeft: data.continuance_count ?? 2,
          sharpEye: data.sharpEye ?? 0,
        });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const screenLabel = { play: "Daily Case", leagues: "Leagues", quests: "Quests", profile: "Profile" }[state.screen];

  if (state.screen === "play" && caseStatus === "error") {
    return <ErrorScreen message={caseError ?? "Failed to load today's case"} />;
  }

  return (
    <div data-screen-label={screenLabel} style={{ minHeight: "100vh", background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)", color: "#3C3C46", padding: "0 0 60px" }}>
      <TopBar state={state} onSelectScreen={actions.setScreen} onOpenStreak={actions.openStreak} />

      {state.screen === "play" && (
        <PlayPage
          state={state}
          countdownText={countdownText}
          caseLoading={caseStatus === "loading"}
          noCase={caseStatus === "no_case"}
          onSelectCard={actions.selectCard}
          onLockIn={actions.lockIn}
          onAdvance={actions.advance}
          onReplay={actions.reset}
        />
      )}
      {state.screen === "leagues"  && <LeaguesPage state={state} />}
      {state.screen === "quests"   && <QuestsPage  state={state} />}
      {state.screen === "profile"  && <ProfilePage state={state} />}

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

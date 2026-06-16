import { useAuth } from "./auth/AuthProvider";
import { ConfettiCanvas } from "./components/ConfettiCanvas";
import { PromoOverlay } from "./components/PromoOverlay";
import { StreakOverlay } from "./components/StreakOverlay";
import { TopBar } from "./components/TopBar";
import { LeaguesPage } from "./pages/LeaguesPage";
import { PlayPage } from "./pages/PlayPage";
import { ProfilePage } from "./pages/ProfilePage";
import { QuestsPage } from "./pages/QuestsPage";
import { SignInPage } from "./pages/SignInPage";
import { Mascot } from "./components/Mascot";
import { useGameState } from "./state/useGameState";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <SplashScreen />;
  if (!session) return <SignInPage />;
  return <Game />;
}

function SplashScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ animation: "qbob 3s ease-in-out infinite" }}>
        <Mascot size={72} mood="neutral" />
      </span>
    </div>
  );
}

function Game() {
  const { state, countdownText, setCanvas, actions } = useGameState({ streak: 14 });

  const screenLabel = { play: "Daily Case", leagues: "Leagues", quests: "Quests", profile: "Profile" }[state.screen];

  return (
    <div
      data-screen-label={screenLabel}
      style={{
        minHeight: "100vh",
        background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)",
        color: "#3C3C46",
        padding: "0 0 60px",
      }}
    >
      <TopBar state={state} onSelectScreen={actions.setScreen} onOpenStreak={actions.openStreak} />

      {state.screen === "play" && (
        <PlayPage
          state={state}
          countdownText={countdownText}
          onSelectCard={actions.selectCard}
          onLockIn={actions.lockIn}
          onAdvance={actions.advance}
          onReplay={actions.reset}
        />
      )}
      {state.screen === "leagues" && <LeaguesPage state={state} />}
      {state.screen === "quests" && <QuestsPage state={state} />}
      {state.screen === "profile" && <ProfilePage state={state} />}

      {state.overlay === "streak" && (
        <StreakOverlay state={state} countdownText={countdownText} onClose={actions.closeOverlay} onEquip={actions.equipContinuance} />
      )}
      {state.overlay === "promo" && <PromoOverlay onDismiss={actions.dismissPromo} />}

      <ConfettiCanvas setCanvas={setCanvas} />
    </div>
  );
}

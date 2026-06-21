import { useState } from "react";
import type { GameState, Screen } from "../state/types";
import { icon } from "../icons/Icon";
import { navView, leagueTierName } from "../state/viewHelpers";
import { useIsMobile } from "../hooks/useMediaQuery";

export interface TopBarProps {
  state: GameState;
  onSelectScreen: (id: Screen) => void;
  onOpenStreak: () => void;
  onHome?: () => void;
  guest?: boolean;
  onSignIn?: () => void;
}

export function TopBar({ state, onSelectScreen, onOpenStreak, onHome, guest = false, onSignIn }: TopBarProps) {
  const isMobile = useIsMobile();
  const navItems = navView(state.screen);
  const [logoPressed, setLogoPressed] = useState(false);

  // The logo is "home". For guests that's the landing page; for signed-in
  // players it's the daily case. Either way we scroll to the top so a click
  // always produces visible feedback.
  function goHome() {
    if (onHome) onHome();
    else onSelectScreen("play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(244,248,238,.88)",
        backdropFilter: "blur(10px)",
        borderBottom: "2px solid #E4EAD8",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: isMobile ? "wrap" : "nowrap",
          gap: isMobile ? 10 : 16,
          padding: isMobile ? "10px 14px" : "13px 22px",
        }}
      >
        <div
          onClick={goHome}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goHome(); } }}
          onMouseDown={() => setLogoPressed(true)}
          onMouseUp={() => setLogoPressed(false)}
          onMouseLeave={() => setLogoPressed(false)}
          onTouchStart={() => setLogoPressed(true)}
          onTouchEnd={() => setLogoPressed(false)}
          role="button"
          tabIndex={0}
          aria-label="Quorum home"
          title="Home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            userSelect: "none",
            transform: logoPressed ? "scale(0.95)" : "scale(1)",
            transition: "transform .12s ease",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "#58CC02",
              boxShadow: "0 3px 0 #46A302",
              fontFamily: "'Baloo 2',cursive",
              fontWeight: 800,
              fontSize: 22,
              color: "#fff",
            }}
          >
            Q
          </span>
          <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 23, color: "#58A700" }}>Quorum</span>
        </div>
        {/* Desktop nav lives in the top bar; on mobile these move to a
            thumb-reachable bottom tab bar (see BottomNav, rendered by the shell). */}
        {!guest && !isMobile && (
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {navItems.map((nav) => (
              <span
                key={nav.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectScreen(nav.id as Screen)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectScreen(nav.id as Screen); } }}
                aria-label={nav.label}
                aria-current={nav.active ? "page" : undefined}
                title={nav.label}
                style={nav.style}
              >
                {nav.iconEl}
                {nav.label}
              </span>
            ))}
          </nav>
        )}
        {guest ? (
          <button
            onClick={onSignIn}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              borderRadius: 12,
              background: "#58CC02",
              border: "none",
              borderBottom: "3px solid #46A302",
              color: "#fff",
              textShadow: "0 1px 1px rgba(0,0,0,.22)",
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              ...(isMobile ? { marginLeft: "auto" } : {}),
            }}
          >
            {icon("user", 17, "#fff")}
            Sign in
          </button>
        ) : (
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, ...(isMobile ? { marginLeft: "auto" } : {}) }}>
          <span
            role="button"
            tabIndex={0}
            onClick={onOpenStreak}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenStreak(); } }}
            aria-label={`${state.streak}-day streak — view details`}
            title="View streak"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 12px",
              borderRadius: 12,
              background: "#FFF3E0",
              border: "2px solid #FFE0B2",
              color: "#FF9600",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            {icon("flame", 19, "#FF9600")}
            {state.streak}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 12px",
              borderRadius: 12,
              background: "#FFF8E1",
              border: "2px solid #FFECB3",
              color: "#E5A300",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {icon("bolt", 19, "#E5A300")}
            {state.totalXp.toLocaleString()}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 12px",
              borderRadius: 12,
              background: "#E3F6FF",
              border: "2px solid #BEEAFD",
              color: "#1899D6",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {icon("trophy", 19, "#1899D6")}
            {!isMobile && leagueTierName(state.totalXp)}
          </span>
        </div>
        )}
      </div>
    </header>
  );
}

// Mobile-only primary navigation: a sticky, thumb-reachable bottom tab bar.
// On desktop the same destinations live in the top bar; on phones they move
// here so the daily case stays the focus and nav is one thumb away. Rendered by
// the app shell (signed-in players only — guests have no nav).
export function BottomNav({ screen, onSelectScreen }: { screen: Screen; onSelectScreen: (id: Screen) => void }) {
  const items = navView(screen);
  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "stretch",
        background: "rgba(244,248,238,.96)",
        backdropFilter: "blur(10px)",
        borderTop: "2px solid #E4EAD8",
        padding: "6px 8px",
        paddingBottom: "max(6px, env(safe-area-inset-bottom))",
      }}
    >
      {items.map((nav) => (
        <button
          key={nav.id}
          onClick={() => onSelectScreen(nav.id as Screen)}
          aria-label={nav.label}
          aria-current={nav.active ? "page" : undefined}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            border: "none",
            cursor: "pointer",
            padding: "6px 4px",
            borderRadius: 12,
            background: nav.active ? "#E8FFD7" : "transparent",
            color: nav.active ? "#58A700" : "#6E7764",
            fontFamily: "'Nunito',sans-serif",
            fontWeight: nav.active ? 800 : 700,
            fontSize: 11,
          }}
        >
          {nav.iconEl}
          {nav.label}
        </button>
      ))}
    </nav>
  );
}

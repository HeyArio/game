import type { CardId, GameState, Screen } from "../state/types";
import { icon } from "../icons/Icon";
import { navView } from "../state/viewHelpers";

export interface TopBarProps {
  state: GameState;
  onSelectScreen: (id: Screen) => void;
  onOpenStreak: () => void;
}

export function TopBar({ state, onSelectScreen, onOpenStreak }: TopBarProps) {
  const navItems = navView(state.screen, onSelectScreen as (id: any) => void);
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
          gap: 16,
          padding: "13px 22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {navItems.map((nav) => (
            <span key={nav.id} onClick={() => onSelectScreen(nav.id as Screen)} style={nav.style}>
              {nav.iconEl}
              {nav.label}
            </span>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            onClick={onOpenStreak}
            title="Streak"
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
            Emerald
          </span>
        </div>
      </div>
    </header>
  );
}

import { Mascot } from "../components/Mascot";
import { icon } from "../icons/Icon";
import type { GameState } from "../state/types";
import { leaguesView } from "../state/viewHelpers";

export interface LeaguesPageProps {
  state: GameState;
}

export function LeaguesPage({ state }: LeaguesPageProps) {
  const leagues = leaguesView(state);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 16, background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, overflowX: "auto" }}>
        {leagues.tiers.map((t, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, minWidth: 78 }}>
            <span style={t.badgeStyle}>{t.iconEl}</span>
            <span style={{ fontWeight: 800, fontSize: 11, color: t.labelColor, whiteSpace: "nowrap" }}>{t.name}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", overflow: "hidden", padding: 24, borderRadius: 22, background: "linear-gradient(135deg,#58CC02,#46A302)", color: "#fff", boxShadow: "0 6px 0 #3E9000" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,.18)", flex: "none" }}>
            {leagues.bigTrophyEl}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 28, lineHeight: 1.05 }}>Emerald League</div>
            <div style={{ fontWeight: 700, fontSize: 14, opacity: 0.92 }}>Top 5 advance to Ruby · 2 days left</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "center", flex: "none" }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 36, lineHeight: 1 }}>#{leagues.youRank}</div>
            <div style={{ fontWeight: 800, fontSize: 11, letterSpacing: ".08em", opacity: 0.9 }}>YOUR RANK</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "#F6ECFF", border: "2px solid #E6D2FF", borderRadius: 18 }}>
        <span style={{ flex: "none", animation: "qbob 3s ease-in-out infinite" }}>
          <Mascot size={46} mood="happy" />
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#7A3FB0", marginBottom: 2 }}>Arbi</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#5E4576", lineHeight: 1.45 }}>{leagues.note}</div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 10 }}>
        {leagues.rows.map((row, i) => (
          <div key={i}>
            {row.promoLineBefore && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 6px" }}>
                <div style={{ flex: 1, height: 2, background: "repeating-linear-gradient(90deg,#A5ED6E 0 7px,transparent 7px 13px)" }} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: 9.5, letterSpacing: ".1em", color: "#58A700" }}>
                  {leagues.promoIconEl}PROMOTION ZONE
                </span>
                <div style={{ flex: 1, height: 2, background: "repeating-linear-gradient(90deg,#A5ED6E 0 7px,transparent 7px 13px)" }} />
              </div>
            )}
            {row.demoLineBefore && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 6px" }}>
                <div style={{ flex: 1, height: 2, background: "repeating-linear-gradient(90deg,#FFB3B3 0 7px,transparent 7px 13px)" }} />
                <span style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: ".1em", color: "#FF4B4B" }}>DEMOTION ZONE</span>
                <div style={{ flex: 1, height: 2, background: "repeating-linear-gradient(90deg,#FFB3B3 0 7px,transparent 7px 13px)" }} />
              </div>
            )}
            <div style={row.style}>
              <span style={{ width: 24, textAlign: "center", fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, color: row.rankColor, flex: "none" }}>
                {row.rankLabel}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: "50%", background: row.color, color: "#fff", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, flex: "none" }}>
                {row.initial}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 15, color: "#3C3C46", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#8E9582", flex: "none" }}>{row.xp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

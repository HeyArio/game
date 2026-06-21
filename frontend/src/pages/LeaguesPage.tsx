import { Mascot } from "../components/Mascot";
import type { GameState } from "../state/types";
import { leaguesView } from "../state/viewHelpers";

export interface LeaguesPageProps {
  state: GameState;
}

export function LeaguesPage({ state }: LeaguesPageProps) {
  const leagues = leaguesView(state);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ position: "relative", overflow: "hidden", padding: 24, borderRadius: 22, background: "linear-gradient(135deg,#58CC02,#46A302)", color: "#fff", boxShadow: "0 6px 0 #3E9000" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,.18)", flex: "none" }}>
            {leagues.bigTrophyEl}
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 28, lineHeight: 1.05 }}>Global Leaderboard</h1>
            <div style={{ fontWeight: 700, fontSize: 14, opacity: 0.92 }}>Every player, ranked by total XP</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "center", flex: "none" }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 36, lineHeight: 1 }}>#{leagues.youRank.toLocaleString()}</div>
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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#5E4576", lineHeight: 1.6 }}>{leagues.note}</div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: "16px 20px" }}>
        <h2 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 14, color: "#7C8470", marginBottom: 14 }}>Your progression</h2>
        <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 4 }}>
          {leagues.tiers.map((t, i) => {
            const threshold = t.min === 0 ? "Start" : t.min >= 1000 ? `${t.min / 1000}k` : String(t.min);
            return (
              <div key={t.name} style={{ display: "flex", alignItems: "flex-start", minWidth: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: "none" }}>
                  <span style={t.badgeStyle}>{t.iconEl}</span>
                  <span style={{ fontWeight: 800, fontSize: 11, color: t.labelColor, whiteSpace: "nowrap" }}>{t.name}</span>
                  <span style={{ fontWeight: 700, fontSize: 9.5, letterSpacing: ".02em", color: t.current ? "#58A700" : "#B2B7A6", whiteSpace: "nowrap" }}>
                    {threshold}{t.min === 0 ? "" : " XP"}
                  </span>
                </div>
                {i < leagues.tiers.length - 1 && (
                  <div style={{ width: 20, height: 2, background: "#E4EAD8", flex: "none", marginTop: 25 }} />
                )}
              </div>
            );
          })}
        </div>
        {leagues.progress ? (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px solid #F0F2EA" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 12.5, color: "#5E6654" }}>Next: {leagues.progress.nextName}</span>
              <span style={{ fontWeight: 800, fontSize: 12.5, color: "#58A700", fontVariantNumeric: "tabular-nums" }}>
                {leagues.progress.xpToNext.toLocaleString()} XP to go
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: "#EEF1E6", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: leagues.progress.pct + "%", background: "linear-gradient(90deg,#58CC02,#46A302)", transition: "width .3s ease" }} />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px solid #F0F2EA", textAlign: "center", fontWeight: 800, fontSize: 12.5, color: "#58A700" }}>
            Top tier reached — you've maxed the ladder.
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 10 }}>
        {leagues.rows.map((row, i) => (
          <div key={i} style={row.style}>
            <span style={{ width: 24, textAlign: "center", fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 15, color: row.rankColor, flex: "none" }}>
              {row.rankLabel}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: "50%", background: row.color, color: "#fff", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16, flex: "none" }}>
              {row.initial}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 15, color: "#3C3C46", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.name}
              {row.isBot && <span role="img" aria-label="AI opponent" title="AI opponent" style={{ marginLeft: 5 }}>🤖</span>}
            </span>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#8E9582", flex: "none" }}>{row.xp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

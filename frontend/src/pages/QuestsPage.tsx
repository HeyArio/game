import { Mascot } from "../components/Mascot";
import type { GameState } from "../state/types";
import { questsView } from "../state/viewHelpers";

export interface QuestsPageProps {
  state: GameState;
}

export function QuestsPage({ state }: QuestsPageProps) {
  const quests = questsView(state, state.stats.votesThisWeek);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, background: "#FFFBF0", border: "2px solid #FFE9A0", borderRadius: 20 }}>
        <span style={{ flex: "none", animation: "qbob 3s ease-in-out infinite" }}>
          <Mascot size={48} mood="neutral" />
        </span>
        <div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 18, color: "#3C3C46" }}>Here's what I've set for you</div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "#7A6540" }}>Clear these and I'll make it worth your while.</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 18, color: "#3C3C46" }}>Daily Quests</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 11, background: "#FFF3E0", border: "2px solid #FFE0B2", color: "#FF9600", fontWeight: 800, fontSize: 13 }}>
          {quests.clockEl}
          {quests.refresh}
        </span>
      </div>

      {quests.daily.map((q, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: q.cardBg, border: `2px solid ${q.cardBorder}`, borderRadius: 18 }}>
          <span style={q.iconWrap}>{q.iconEl}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14.5, color: "#3C3C46" }}>{q.label}</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: q.countColor }}>{q.countLabel}</span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: "#EEF1E6", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: q.barWidth, background: q.barColor, transition: "width .3s ease" }} />
            </div>
          </div>
          <span style={q.rewardStyle}>
            {q.rewardEl}
            {q.rewardLabel}
          </span>
        </div>
      ))}

      <div style={{ marginTop: 8, fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 18, color: "#3C3C46" }}>Weekly Challenge</div>
      <div style={{ position: "relative", overflow: "hidden", padding: 22, borderRadius: 22, background: "linear-gradient(135deg,#1CB0F6,#1899D6)", color: "#fff", boxShadow: "0 6px 0 #137FB5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 62, height: 62, borderRadius: 20, background: "rgba(255,255,255,.2)", flex: "none" }}>
            {quests.weekly.chestEl}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{quests.weekly.label}</div>
            <div style={{ opacity: 0.92, fontWeight: 700, fontSize: 14, margin: "3px 0 10px" }}>{quests.weekly.sub}</div>
            <div style={{ height: 13, borderRadius: 999, background: "rgba(255,255,255,.28)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: quests.weekly.barWidth, background: "#fff" }} />
            </div>
          </div>
          <div style={{ textAlign: "center", flex: "none" }}>
            <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{quests.weekly.count}</div>
            <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.9 }}>{quests.weekly.goalLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

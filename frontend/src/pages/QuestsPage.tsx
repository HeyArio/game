import { useState, type CSSProperties, type ReactNode } from "react";
import { Mascot } from "../components/Mascot";
import { icon } from "../icons/Icon";
import { useQuests } from "../hooks/useQuests";
import { questsView, type QuestItemView } from "../state/viewHelpers";

export interface QuestsPageProps {
  countdownText?: string;
  /** Called after a successful claim with the server's authoritative totals. */
  onClaimed?: (totalXp: number, level: number) => void;
}

const pill = (bg: string, col: string): CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 999,
  flex: "none", background: bg, color: col, fontWeight: 800, fontSize: 12.5, whiteSpace: "nowrap",
});

export function QuestsPage({ countdownText = "", onClaimed }: QuestsPageProps) {
  const { quests, loading, claimingKey, claim } = useQuests();
  const view = questsView(quests, countdownText);
  const [toast, setToast] = useState<string | null>(null);

  async function onClaim(key: string) {
    const r = await claim(key);
    if (r?.ok && !r.already && r.reward_xp) {
      onClaimed?.(r.total_xp ?? 0, r.level ?? 1);
      setToast(`+${r.reward_xp} XP claimed`);
      setTimeout(() => setToast(null), 2200);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px", display: "flex", justifyContent: "center" }}>
        <span style={{ animation: "qbob 3s ease-in-out infinite" }}><Mascot size={56} mood="neutral" /></span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, background: "#FFFBF0", border: "2px solid #FFE9A0", borderRadius: 20 }}>
        <span style={{ flex: "none", animation: "qbob 3s ease-in-out infinite" }}>
          <Mascot size={48} mood="neutral" />
        </span>
        <div>
          <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 18, color: "#3C3C46" }}>Here's what I've set for you</div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "#7A6540" }}>Clear these and claim the bonus XP on top of the case.</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 18, color: "#3C3C46" }}>Daily Quests</span>
        {view.refresh && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 11, background: "#FFF3E0", border: "2px solid #FFE0B2", color: "#FF9600", fontWeight: 800, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
            {view.clockEl}
            {view.refresh}
          </span>
        )}
      </div>

      {view.daily.map((q) => (
        <div key={q.questKey} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: q.cardBg, border: `2px solid ${q.cardBorder}`, borderRadius: 18 }}>
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
          <QuestAction q={q} busy={claimingKey === q.questKey} onClaim={() => onClaim(q.questKey)} />
        </div>
      ))}

      {view.weekly && (
        <>
          <div style={{ marginTop: 8, fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 18, color: "#3C3C46" }}>Weekly Challenge</div>
          <div style={{ position: "relative", overflow: "hidden", padding: 22, borderRadius: 22, background: "linear-gradient(135deg,#1CB0F6,#1899D6)", color: "#fff", boxShadow: "0 6px 0 #137FB5" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 62, height: 62, borderRadius: 20, background: "rgba(255,255,255,.2)", flex: "none" }}>
                {view.weekly.iconEl}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{view.weekly.label}</div>
                <div style={{ opacity: 0.92, fontWeight: 700, fontSize: 14, margin: "3px 0 10px" }}>{view.weekly.sub}</div>
                <div style={{ height: 13, borderRadius: 999, background: "rgba(255,255,255,.28)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, width: view.weekly.barWidth, background: "#fff" }} />
                </div>
              </div>
              <div style={{ textAlign: "center", flex: "none" }}>
                <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{view.weekly.count}</div>
                <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.9 }}>{view.weekly.goalLabel}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 13, opacity: 0.95 }}>Reward {view.weekly.rewardLabel}</span>
              {view.weekly.claimed ? (
                <span style={pill("rgba(255,255,255,.25)", "#fff")}>{icon("check", 15, "#fff", 2.6)} Claimed</span>
              ) : view.weekly.claimable ? (
                <PressButton
                  onClick={() => onClaim(view.weekly!.questKey)}
                  disabled={claimingKey === view.weekly.questKey}
                  style={{ background: "#fff", color: "#1899D6", boxShadow: "0 3px 0 #137FB5" }}
                >
                  {icon("bolt", 15, "#1899D6")} {claimingKey === view.weekly.questKey ? "Claiming…" : `Claim ${view.weekly.rewardLabel}`}
                </PressButton>
              ) : (
                <span style={{ fontWeight: 800, fontSize: 12.5, opacity: 0.8 }}>Keep going</span>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 50, padding: "11px 18px", borderRadius: 14, background: "#3C3C46", color: "#fff", fontWeight: 800, fontSize: 14, boxShadow: "0 6px 20px rgba(0,0,0,.18)", animation: "qrise .35s ease both" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function QuestAction({ q, busy, onClaim }: { q: QuestItemView; busy: boolean; onClaim: () => void }) {
  if (q.claimed) {
    return <span style={pill("#58CC02", "#fff")}>{icon("check", 15, "#fff", 2.6)} Claimed</span>;
  }
  if (q.claimable) {
    return (
      <PressButton onClick={onClaim} disabled={busy} style={{ background: "#58CC02", color: "#fff", boxShadow: "0 3px 0 #46A302" }}>
        {icon("bolt", 15, "#fff")} {busy ? "Claiming…" : `Claim ${q.rewardLabel}`}
      </PressButton>
    );
  }
  return <span style={pill("#F0F2EA", "#9AA08C")}>{q.rewardLabel}</span>;
}

function PressButton({ children, onClick, disabled, style }: { children: ReactNode; onClick: () => void; disabled?: boolean; style: CSSProperties }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, border: "none",
        cursor: disabled ? "default" : "pointer", padding: "10px 16px", borderRadius: 12,
        fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap",
        flex: "none", opacity: disabled ? 0.75 : 1, transition: "transform .05s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

import { Mascot } from "../components/Mascot";
import type { GameState } from "../state/types";
import { profileView } from "../state/viewHelpers";
import { useAuth } from "../auth/AuthProvider";
import { useIsMobile } from "../hooks/useMediaQuery";

export interface ProfilePageProps {
  state: GameState;
}

export function ProfilePage({ state }: ProfilePageProps) {
  const isMobile = useIsMobile();
  const profile = profileView(state, state.stats);
  const { user, signOut } = useAuth();

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const displayName = meta.full_name || meta.name || user?.email?.split("@")[0] || "You";
  const handle = user?.email ? "@" + user.email.split("@")[0] : "@you";
  const initial = (displayName[0] || "Y").toUpperCase();
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 14 : 18, padding: 22, background: "#fff", border: "2px solid #E4EAD8", borderRadius: 22, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 84,
            height: 84,
            borderRadius: 26,
            background: "linear-gradient(135deg,#58CC02,#46A302)",
            color: "#fff",
            fontFamily: "'Baloo 2',cursive",
            fontWeight: 800,
            fontSize: 38,
            flex: "none",
            boxShadow: "0 4px 0 #3E9000",
          }}
        >
          {initial}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 26, color: "#3C3C46", lineHeight: 1.1 }}>{displayName}</h1>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#9AA08C" }}>{handle}{joined ? ` · Joined ${joined}` : ""}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: "#F6ECFF", color: "#7A3FB0", fontWeight: 800, fontSize: 12 }}>
              {profile.levelEl}Level {state.level}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: "#E3F6FF", color: "#1899D6", fontWeight: 800, fontSize: 12 }}>
              {profile.leagueEl}{profile.tier}
            </span>
          </div>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: "2px solid #BEEAFD",
            borderBottomWidth: "4px",
            background: "#E3F6FF",
            color: "#1899D6",
            padding: "11px 16px",
            borderRadius: 14,
            fontFamily: "'Nunito',sans-serif",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            flex: "none",
          }}
        >
          {profile.shareEl}Share
        </button>
        <button
          onClick={signOut}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: "2px solid #E4EAD8",
            borderBottomWidth: "4px",
            background: "#fff",
            color: "#8E9582",
            padding: "11px 16px",
            borderRadius: 14,
            fontFamily: "'Nunito',sans-serif",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            flex: "none",
          }}
        >
          Sign out
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12 }}>
        {profile.stats.map((st, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "16px 12px", background: "#fff", border: "2px solid #E4EAD8", borderRadius: 18, textAlign: "center" }}>
            <span style={st.iconWrap}>{st.iconEl}</span>
            <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 21, color: "#3C3C46", lineHeight: 1 }}>{st.value}</span>
            <span style={{ fontWeight: 700, fontSize: 11.5, color: "#9AA08C" }}>{st.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, padding: 18, background: "#F6ECFF", border: "2px solid #E6D2FF", borderRadius: 20 }}>
        <span style={{ flex: "none", animation: "qbob 3s ease-in-out infinite" }}>
          <Mascot size={48} mood="happy" />
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#7A3FB0", marginBottom: 3 }}>A note from Arbi</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#5E4576", lineHeight: 1.6 }}>{profile.note}</div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, padding: 20 }}>
        <h2 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 18, color: "#3C3C46", marginBottom: 16 }}>Achievements</h2>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
          {profile.achievements.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: 14, borderRadius: 16, background: a.bg, border: "2px solid " + a.border }}>
              <span style={a.iconWrap}>{a.iconEl}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: a.titleColor }}>{a.title}</div>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#9AA08C", margin: "1px 0 7px" }}>{a.desc}</div>
                <div style={{ height: 8, borderRadius: 999, background: "#EEF1E6", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, width: a.barWidth, background: a.barColor }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {profile.figures.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: 16, background: "#fff", border: "2px solid #E4EAD8", borderRadius: 18 }}>
            <span style={f.iconWrap}>{f.iconEl}</span>
            <div>
              <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 20, color: "#3C3C46", lineHeight: 1 }}>{f.value}</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#9AA08C" }}>{f.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

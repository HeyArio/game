import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Mascot } from "../components/Mascot";
import type { GameState } from "../state/types";
import { profileView } from "../state/viewHelpers";
import { useAuth } from "../auth/AuthProvider";
import { useIsMobile } from "../hooks/useMediaQuery";
import { fetchMyInvite, inviteUrl, shareInvite, type MyInvite } from "../lib/invite";

export interface ProfilePageProps {
  state: GameState;
}

export function ProfilePage({ state }: ProfilePageProps) {
  const isMobile = useIsMobile();
  const profile = profileView(state, state.stats);
  const { user, signOut } = useAuth();
  const [invite, setInvite] = useState<MyInvite | null>(null);
  useEffect(() => { fetchMyInvite().then(setInvite); }, []);

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const displayName = meta.full_name || meta.name || user?.email?.split("@")[0] || "You";
  const handle = user?.email ? "@" + user.email.split("@")[0] : "@you";
  const initial = (displayName[0] || "Y").toUpperCase();
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;
  const shareSummary =
    `I'm on a ${state.streak}-day streak on Quorum — Level ${state.level}, ${profile.tier} league, ` +
    `${state.stats.agreementPct}% agreement with the judge. Come test your judgment:`;

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
            {invite?.is_founder && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: "#FFF3D4", color: "#A9791C", fontWeight: 800, fontSize: 12 }}>
                🎖 Founding member
              </span>
            )}
          </div>
        </div>
        <ProfileShareButton shareEl={profile.shareEl} summary={shareSummary} />
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

      <InviteCard invite={invite} />

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

// Share the player's profile — native share sheet where available, else copy a
// summary + link to the clipboard. Gives the (previously inert) Share button a
// real, on-brand action with inline feedback.
function ProfileShareButton({ shareEl, summary }: { shareEl: ReactNode; summary: string }) {
  const [label, setLabel] = useState("Share");
  const style: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "2px solid #BEEAFD", borderBottomWidth: "4px",
    background: "#E3F6FF", color: "#1899D6",
    padding: "11px 16px", borderRadius: 14,
    fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13,
    cursor: "pointer", flex: "none",
  };
  async function onShare() {
    const url = "https://quorumdaily.com/";
    try {
      const nav = navigator as unknown as { share?: (d: unknown) => Promise<void> };
      if (nav.share) {
        await nav.share({ title: "Quorum", text: summary, url });
        setLabel("Shared!");
      } else {
        await navigator.clipboard.writeText(`${summary} ${url}`);
        setLabel("Copied!");
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return; // sheet dismissed
      try { await navigator.clipboard.writeText(`${summary} ${url}`); setLabel("Copied!"); }
      catch { setLabel("Couldn't share"); }
    }
    setTimeout(() => setLabel("Share"), 1900);
  }
  return (
    <button onClick={onShare} aria-label="Share your Quorum profile" style={style}>
      {shareEl}{label}
    </button>
  );
}

// Personal invite link — every player's stable "join as a founding member" link.
// Copy or share it; anyone who joins via it becomes a founding member, and it
// credits the inviter (feeding the existing invite quest + referral stats).
function InviteCard({ invite }: { invite: MyInvite | null }) {
  const [copied, setCopied] = useState(false);
  const code = invite?.code;
  const link = code ? inviteUrl(code) : "";
  const joined = invite?.friends_joined ?? 0;

  async function onCopy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1900); }
    catch { /* clipboard blocked — the field is selectable as a fallback */ }
  }
  function onShare() { if (code) void shareInvite(code); }

  return (
    <div style={{ background: "#fff", border: "2px solid #C4E89E", borderRadius: 20, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 18, color: "#3C3C46" }}>Invite friends</h2>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#7C8470", marginTop: 2 }}>
            Anyone who joins via your link becomes a <b style={{ color: "#46A302" }}>founding member</b>.
          </div>
        </div>
        {joined > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 12, background: "#E8FFD7", color: "#3E7200", fontWeight: 800, fontSize: 13, flex: "none" }}>
            {joined} joined via you
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          readOnly
          value={link || "Sign in to get your invite link"}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your personal invite link"
          style={{ flex: 1, minWidth: 200, padding: "11px 14px", borderRadius: 12, border: "2px solid #E4EAD8", background: "#F8FBF2", color: "#3C3C46", fontWeight: 700, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}
        />
        <button onClick={onCopy} disabled={!link} style={invitePill("#E8FFD7", "#A5ED6E", "#3E7200", !link)}>
          {copied ? "Copied!" : "Copy"}
        </button>
        <button onClick={onShare} disabled={!link} style={invitePill("#58CC02", "#46A302", "#fff", !link)}>
          Share
        </button>
      </div>
    </div>
  );
}

function invitePill(bg: string, border: string, color: string, disabled: boolean): CSSProperties {
  return {
    border: "2px solid " + border, borderBottomWidth: "4px",
    background: bg, color,
    padding: "11px 18px", borderRadius: 12,
    fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14,
    cursor: disabled ? "default" : "pointer", flex: "none",
    opacity: disabled ? 0.55 : 1,
  };
}

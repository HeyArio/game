import { Mascot } from "./Mascot";
import type { Challenge } from "../lib/challenge";

// Shown to a recipient who arrived via a challenge link (?c=<id>). Pre-vote
// only — once they've played, the You-vs-them-vs-Arbi line in the reveal takes
// over. Deliberately spoiler-free: never shows the challenger's pick here.
export function ChallengeBanner({ challenge, todayCaseNo }: { challenge: Challenge; todayCaseNo: number }) {
  const name = challenge.challenger_name || "A Quorum player";
  // The link may be for an older, now-closed case. If so, we still convert the
  // visitor — onto today's case — but say so honestly.
  const sameCase = challenge.case_no != null && challenge.case_no === todayCaseNo;

  return (
    <div
      role="status"
      style={{
        display: "flex", alignItems: "center", gap: 13, marginBottom: 14,
        padding: "13px 16px", background: "#F1FCE6",
        border: "2px solid #C4E89E", borderBottom: "4px solid #58CC02", borderRadius: 16,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, flex: "none", animation: "qbob 3s ease-in-out infinite" }}>
        <Mascot size={48} mood="happy" />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#3C3C46" }}>
          <b style={{ color: "#46A302" }}>{name}</b>{" "}
          {sameCase ? "challenged you on today's case." : `challenged you on Case #${challenge.case_no}.`}
        </div>
        <div style={{ fontSize: 14, color: "#5E6553", fontWeight: 600 }}>
          {sameCase
            ? "Back the answer you'd defend — then see if you out-judged them and Arbi."
            : "That one's closed, but here's today's. Take it on and challenge them back."}
        </div>
      </div>
    </div>
  );
}

// Compact head-to-head line shown in the reveal when the recipient played the
// SAME case the challenger did. Safe now: the verdict is already revealed on
// this screen, so showing the challenger's pick can't spoil anything.
export function ChallengeOutcome({ challenge, yourLetter, judgeLetter }: {
  challenge: Challenge;
  yourLetter: string | null;
  judgeLetter: string | null;
}) {
  const pick = (challenge.challenger_pick ?? "").toUpperCase();
  if (!pick) return null;
  const name = challenge.challenger_name || "A Quorum player";
  const theyMatched = judgeLetter != null && pick === judgeLetter.toUpperCase();
  const youBeatThem =
    yourLetter != null && judgeLetter != null &&
    yourLetter.toUpperCase() === judgeLetter.toUpperCase() && !theyMatched;

  let verdict: string;
  if (youBeatThem) verdict = `You out-judged ${name}. 🏆`;
  else if (theyMatched && !(yourLetter && judgeLetter && yourLetter.toUpperCase() === judgeLetter.toUpperCase())) verdict = `${name} edged this one — rematch?`;
  else if (theyMatched) verdict = `You both nailed it.`;
  else verdict = `Neither of you matched Arbi this time.`;

  return (
    <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,.7)", border: "1.5px solid rgba(60,60,70,.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 11, letterSpacing: ".08em", color: "#46A302", marginBottom: 6 }}>
        ⚔️ CHALLENGE · YOU VS {name.toUpperCase()}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#5E6553" }}>
        {name} backed <b>{pick}</b>. {verdict}
      </div>
    </div>
  );
}

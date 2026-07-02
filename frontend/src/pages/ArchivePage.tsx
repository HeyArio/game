import { useEffect, useState, type CSSProperties } from "react";
import { Mascot } from "../components/Mascot";
import { icon } from "../icons/Icon";
import { supabase } from "../lib/supabase";
import { COLORS } from "../state/viewHelpers";

// The back-catalog: every closed case with the four arguments, Arbi's pick and
// reasoning, the final crowd split, and the player's own call. This is the
// study material of a judgment game — the place to learn what Arbi values and
// to see your agreement % as a record of real decisions, not a bare number.

interface ArchiveOption {
  letter: string;
  model_name: string;
  pick: string;
  rationale: string;
  is_judge_pick: boolean;
  final_pct: number;
}

interface ArchiveCase {
  case_no: number;
  question: string;
  category: string;
  closed_at: string;
  judge_reasoning: string | null;
  options: ArchiveOption[];
  my_letter: string | null;
  my_correct: boolean | null;
  my_confidence: string | null;
  my_xp: number | null;
}

const PAGE_SIZE = 20;

const CONFIDENCE_LABEL: Record<string, string> = { low: "Safe", med: "Balanced", high: "Bold" };

export function ArchivePage() {
  const [cases, setCases] = useState<ArchiveCase[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [openCaseNo, setOpenCaseNo] = useState<number | null>(null);

  async function fetchPage(beforeCaseNo: number | null) {
    const { data, error } = await supabase.rpc("get_case_archive", {
      p_limit: PAGE_SIZE,
      p_before_case_no: beforeCaseNo,
    });
    if (error) throw error;
    return (data ?? []) as ArchiveCase[];
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await fetchPage(null);
        if (cancelled) return;
        setCases(page);
        setHasMore(page.length === PAGE_SIZE);
        setStatus("ready");
      } catch (e) {
        console.error("[Archive] load failed:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onLoadMore() {
    if (loadingMore || !cases.length) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(cases[cases.length - 1].case_no);
      setCases((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      console.error("[Archive] load-more failed:", e);
    } finally {
      setLoadingMore(false);
    }
  }

  if (status === "loading") {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px", display: "flex", justifyContent: "center" }}>
        <span style={{ animation: "qbob 3s ease-in-out infinite" }}><Mascot size={64} mood="neutral" /></span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ maxWidth: 620, margin: "40px auto", padding: "32px 28px", background: "#fff", border: "2px solid #E4EAD8", borderRadius: 24, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Mascot size={64} mood="soft" /></div>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 22, color: "#3C3C46", marginTop: 12 }}>The archive isn't available yet</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#8E9582", marginTop: 6 }}>Past cases will appear here once the docket has history. Check back after today's case closes.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 28, color: "#3C3C46" }}>Case archive</h1>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#8E9582", marginTop: 4 }}>
          Every closed case: the arguments, Arbi's verdict, the crowd — and your call. Study the record; that's how you learn the judge.
        </div>
      </div>

      {cases.length === 0 && (
        <div style={{ padding: "28px 24px", background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, textAlign: "center", fontWeight: 700, color: "#8E9582" }}>
          No closed cases yet — the archive starts filling in tomorrow.
        </div>
      )}

      {cases.map((c) => (
        <ArchiveCaseCard
          key={c.case_no}
          data={c}
          open={openCaseNo === c.case_no}
          onToggle={() => setOpenCaseNo((cur) => (cur === c.case_no ? null : c.case_no))}
        />
      ))}

      {hasMore && cases.length > 0 && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          style={{ alignSelf: "center", cursor: loadingMore ? "default" : "pointer", border: "2px solid #E4EAD8", borderBottomWidth: 4, background: "#fff", color: "#46A302", padding: "12px 24px", borderRadius: 14, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, opacity: loadingMore ? 0.6 : 1 }}
        >
          {loadingMore ? "Loading…" : "Load older cases"}
        </button>
      )}
    </div>
  );
}

function ArchiveCaseCard({ data, open, onToggle }: { data: ArchiveCase; open: boolean; onToggle: () => void }) {
  const judge = data.options.find((o) => o.is_judge_pick) ?? null;
  const played = data.my_letter != null;
  const dateLabel = new Date(data.closed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div style={{ background: "#fff", border: "2px solid #E4EAD8", borderRadius: 20, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "16px 18px", cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ padding: "4px 10px", borderRadius: 9, background: "#E8FFD7", color: "#46A302", fontWeight: 800, fontSize: 11 }}>#{data.case_no}</span>
          <span style={{ padding: "4px 10px", borderRadius: 9, background: "#F4F8EE", border: "1.5px solid #E4EAD8", color: "#7C8470", fontWeight: 700, fontSize: 11 }}>{data.category}</span>
          <span style={{ fontWeight: 700, fontSize: 11.5, color: "#B2B7A6" }}>{dateLabel}</span>
          <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 12, color: "#9AA08C" }}>{open ? "Hide ▲" : "Review ▼"}</span>
        </div>
        <div style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 18, lineHeight: 1.25, color: "#3C3C46" }}>{data.question}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {judge && (
            <span style={chip("#E8FFD7", "#46A302")}>
              {icon("scale", 14, "#46A302")} Arbi: {judge.letter}
            </span>
          )}
          {played ? (
            <span style={chip(data.my_correct ? "#E3F6FF" : "#FFF3E0", data.my_correct ? "#1899D6" : "#E07F00")}>
              You: {data.my_letter} {data.my_correct ? "✓ matched" : "✗"}
              {data.my_confidence ? ` · ${CONFIDENCE_LABEL[data.my_confidence] ?? data.my_confidence}` : ""}
              {data.my_xp != null ? ` · +${data.my_xp} XP` : ""}
            </span>
          ) : (
            <span style={chip("#F4F1EC", "#9A8E7C")}>You sat this one out</span>
          )}
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px", borderTop: "2px dashed #EEF1E6" }}>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {data.options.map((o) => {
              const isJudge = o.is_judge_pick;
              const isMine = o.letter === data.my_letter;
              return (
                <div key={o.letter} style={{ padding: "12px 14px", borderRadius: 14, background: isJudge ? "#F1FCE6" : "#FAFBF7", border: "2px solid " + (isJudge ? "#C4E89E" : isMine ? "#FFCC80" : "#EEF1E6") }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, background: COLORS[o.letter] ?? "#9AA08C", color: "#fff", fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 13, flex: "none" }}>{o.letter}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#3C3C46" }}>{o.pick}</span>
                    <span style={{ fontWeight: 700, fontSize: 11, color: "#9AA08C" }}>{o.model_name}</span>
                    <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, alignItems: "center" }}>
                      {isJudge && <span style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: ".06em", color: "#46A302" }}>ARBI'S PICK</span>}
                      {isMine && <span style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: ".06em", color: "#E07F00" }}>YOUR PICK</span>}
                      <span style={{ fontWeight: 800, fontSize: 12, color: "#7C8470" }}>{Math.round(o.final_pct)}%</span>
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: "#EEF1E6", overflow: "hidden", margin: "8px 0" }}>
                    <div style={{ height: "100%", borderRadius: 999, width: `${Math.min(100, Math.max(0, o.final_pct))}%`, background: isJudge ? "#58CC02" : "#BFC5B2" }} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.55, color: "#5E6553" }}>{o.rationale}</div>
                </div>
              );
            })}
          </div>

          {data.judge_reasoning && (
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 13, background: "#F5FFF0", border: "1.5px solid #D4F0B0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 10.5, letterSpacing: ".08em", color: "#58A700", marginBottom: 4 }}>
                {icon("scale", 14, "#58A700")} WHY ARBI PICKED {judge?.letter ?? ""}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.6, color: "#5E6553" }}>{data.judge_reasoning}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function chip(bg: string, color: string): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, background: bg, color, fontWeight: 800, fontSize: 12 };
}

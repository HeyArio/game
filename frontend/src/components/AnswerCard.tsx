import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { icon } from "../icons/Icon";
import type { ViewCard } from "../state/viewHelpers";

export interface AnswerCardProps {
  card: ViewCard;
  onSelect: () => void;
}

export function AnswerCard({ card, onSelect }: AnswerCardProps) {
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const rationaleRef = useRef<HTMLParagraphElement>(null);
  const interactive = card.style.cursor === "pointer";
  const noAnswer = card.pick === "No response";

  // Progressive disclosure: the rationale is clamped to two lines so the card
  // reads as a skimmable PICK first. Only when the text actually overflows that
  // clamp do we surface a "Why this?" expander — short answers just show in full.
  // Re-measured when the answer changes, the card collapses, or the layout reflows.
  useLayoutEffect(() => {
    if (noAnswer) { setOverflowing(false); return; }
    const measure = () => {
      const el = rationaleRef.current;
      if (!el || expanded) return;
      setOverflowing(el.scrollHeight - el.clientHeight > 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [card.answer, expanded, noAnswer]);

  const showToggle = !noAnswer && (overflowing || expanded);

  const clampStyle: CSSProperties = expanded
    ? {}
    : { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" };

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? card.selected : undefined}
      aria-label={interactive ? `Select answer ${card.letter}` : undefined}
      onClick={onSelect}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } } : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...card.style,
        ...(interactive && hover ? { transform: "translateY(-3px)", boxShadow: "0 6px 18px rgba(60,60,70,.08)" } : {}),
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={card.badgeStyle}>{card.letter}</span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          {card.showId ? (
            <>
              <span
                style={{
                  fontFamily: "'Baloo 2',cursive",
                  fontWeight: 700,
                  fontSize: 16,
                  lineHeight: 1.1,
                  color: card.idColor,
                  animation: "qfade .4s ease both",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {card.name}
              </span>
              <span style={{ fontWeight: 800, fontSize: 10, letterSpacing: ".1em", color: "#B2B7A6", marginTop: 2 }}>{card.modelLabel}</span>
            </>
          ) : (
            <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".08em", color: "#9AA08C" }}>{card.modelLabel}</span>
          )}
        </div>
        {card.showArbiter && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 11px",
              borderRadius: 999,
              background: "#58CC02",
              color: "#fff",
              fontWeight: 800,
              fontSize: 11,
              flex: "none",
              boxShadow: "0 2px 0 #46A302",
              animation: "qpop .45s ease both",
            }}
          >
            {icon("check", 16, "#fff", 2.6)}
            {card.arbiterTag}
          </span>
        )}
        {card.showWrong && (
          <span
            style={{
              padding: "6px 11px",
              borderRadius: 999,
              background: "#FFF3E0",
              border: "2px solid #FFCC80",
              color: "#F57C00",
              fontWeight: 800,
              fontSize: 11,
              flex: "none",
            }}
          >
            YOUR PICK
          </span>
        )}
      </div>

      {/* Pick — the model's stance, accented. This is the hero of the card; kept
          to a tight headline (clamped) so the four takes stay glanceable. */}
      <div
        style={{
          position: "relative",
          marginTop: 14,
          padding: "11px 13px 11px 16px",
          borderRadius: 13,
          background: "rgba(255,255,255,.55)",
          border: "1.5px solid rgba(60,60,70,.06)",
        }}
      >
        <span style={{ position: "absolute", left: 6, top: 11, bottom: 11, width: 4, borderRadius: 999, background: card.accent, opacity: noAnswer ? 0.25 : 1 }} />
        <span style={{ display: "block", fontWeight: 800, fontSize: 10, letterSpacing: ".08em", color: card.accent, marginBottom: 3, opacity: noAnswer ? 0.5 : 0.9 }}>PICK</span>
        <span
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 3,
            overflow: "hidden",
            fontFamily: "'Baloo 2',cursive",
            fontWeight: 700,
            fontSize: 17,
            lineHeight: 1.28,
            color: noAnswer ? "#A7AC9C" : "#3C3C46",
            fontStyle: noAnswer ? "italic" : "normal",
          }}
        >
          {card.pick}
        </span>
      </div>

      {/* Rationale — collapsed to two lines by default, expandable on demand. */}
      <p
        ref={rationaleRef}
        style={{
          marginTop: 10,
          fontSize: 14.5,
          lineHeight: 1.6,
          color: noAnswer ? "#A7AC9C" : "#6E7365",
          fontWeight: 600,
          fontStyle: noAnswer ? "italic" : "normal",
          ...clampStyle,
        }}
      >
        {card.answer}
      </p>

      {showToggle && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
          style={{
            alignSelf: "flex-start",
            marginTop: 6,
            padding: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Nunito',sans-serif",
            fontWeight: 800,
            fontSize: 12.5,
            color: card.accent,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {expanded ? "Show less" : "Why this?"}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke={card.accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}

      {/* Spacer pushes the voters bar to the bottom so cards align */}
      <div style={{ flex: 1 }} />

      {card.showBars && (
        <div style={{ marginTop: 14, animation: "qfade .4s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: 11, letterSpacing: ".04em", color: "#9AA08C" }}>
              {icon("users", 15, "#9AA08C")}VOTERS{card.crowdTag}
            </span>
            <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 17, color: card.barColor }}>{card.pctLabel}</span>
          </div>
          <div style={{ height: 11, borderRadius: 999, background: "#EEF1E6", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 999, width: card.barWidth, background: card.barColor, transition: "width .1s linear" }} />
          </div>
        </div>
      )}
    </div>
  );
}

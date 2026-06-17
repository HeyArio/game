import { icon } from "../icons/Icon";
import type { ViewCard } from "../state/viewHelpers";

export interface AnswerCardProps {
  card: ViewCard;
  onSelect: () => void;
}

export function AnswerCard({ card, onSelect }: AnswerCardProps) {
  return (
    <div onClick={onSelect} style={card.style}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={card.badgeStyle}>{card.letter}</span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: ".1em", color: "#9AA08C" }}>{card.modelLabel}</span>
          {card.showId && (
            <span
              style={{
                fontFamily: "'Baloo 2',cursive",
                fontWeight: 700,
                fontSize: 16,
                color: card.idColor,
                animation: "qfade .4s ease both",
              }}
            >
              {card.name}
            </span>
          )}
        </div>
        {card.showArbiter && (
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 11px",
              borderRadius: 999,
              background: "#58CC02",
              color: "#fff",
              fontWeight: 800,
              fontSize: 11,
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
              marginLeft: "auto",
              padding: "6px 11px",
              borderRadius: 999,
              background: "#FFF3E0",
              border: "2px solid #FFCC80",
              color: "#F57C00",
              fontWeight: 800,
              fontSize: 11,
            }}
          >
            YOUR PICK
          </span>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: 10.5, letterSpacing: ".09em", color: "#B2B7A6", marginBottom: 4 }}>PICKS</span>
        <span style={{ display: "block", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 16.5, lineHeight: 1.3, color: "#3C3C46" }}>{card.pick}</span>
      </div>
      <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.55, color: "#74796B", fontWeight: 600 }}>{card.answer}</p>

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

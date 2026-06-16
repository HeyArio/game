// Port of the original `mascot(size, mood)` method — Arbi, the AI judge mascot.

export type MascotMood = "neutral" | "happy" | "soft";

export interface MascotProps {
  size: number;
  mood?: MascotMood;
}

const DK = "#2E6B00";

export function Mascot({ size, mood = "neutral" }: MascotProps): JSX.Element {
  const face: JSX.Element[] = [];

  if (mood === "happy") {
    face.push(
      <path key="e1" d="M21 31 Q25 26 29 31" fill="none" stroke={DK} strokeWidth={2.8} strokeLinecap="round" />,
      <path key="e2" d="M35 31 Q39 26 43 31" fill="none" stroke={DK} strokeWidth={2.8} strokeLinecap="round" />,
      <path key="m" d="M25 36 Q32 44 39 36 Z" fill={DK} />,
      <circle key="c1" cx={20.5} cy={35} r={2} fill="#FF8FA3" opacity={0.85} />,
      <circle key="c2" cx={43.5} cy={35} r={2} fill="#FF8FA3" opacity={0.85} />
    );
  } else if (mood === "soft") {
    face.push(
      <circle key="e1" cx={25} cy={31} r={3.3} fill={DK} />,
      <circle key="e2" cx={39} cy={31} r={3.3} fill={DK} />,
      <path key="b1" d="M21 25.5 L28 24.5" fill="none" stroke={DK} strokeWidth={2} strokeLinecap="round" />,
      <path key="b2" d="M36 24.5 L43 25.5" fill="none" stroke={DK} strokeWidth={2} strokeLinecap="round" />,
      <path key="m" d="M27 38.5 Q32 40.5 37 38.5" fill="none" stroke={DK} strokeWidth={2.6} strokeLinecap="round" />
    );
  } else {
    face.push(
      <circle key="e1" cx={25} cy={30} r={3.6} fill={DK} />,
      <circle key="e2" cx={39} cy={30} r={3.6} fill={DK} />,
      <circle key="h1" cx={26.2} cy={28.8} r={1.1} fill="#fff" />,
      <circle key="h2" cx={40.2} cy={28.8} r={1.1} fill="#fff" />,
      <path key="m" d="M26 37 Q32 41 38 37" fill="none" stroke={DK} strokeWidth={2.6} strokeLinecap="round" />
    );
  }

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "block", flex: "none", overflow: "visible" }}>
      <line x1={32} y1={13} x2={32} y2={6} stroke="#46A302" strokeWidth={3} strokeLinecap="round" />
      <circle cx={32} cy={4.5} r={5} fill="#7BE021" opacity={0.4} />
      <circle cx={32} cy={4.5} r={3} fill="#58CC02" />
      <circle cx={10.5} cy={33} r={3} fill="#46A302" />
      <circle cx={53.5} cy={33} r={3} fill="#46A302" />
      <rect x={12} y={12} width={40} height={40} rx={15} fill="#58CC02" />
      <rect x={12} y={38} width={40} height={14} rx={7} fill="#4FBE00" />
      <rect x={17} y={19} width={30} height={26} rx={11} fill="#ECFCDD" />
      {face}
    </svg>
  );
}

import { createElement } from "react";

// Port of the ICONS map + icon() helper from the original .dc.html mockup.
// Each shape entry is either a <path>, <circle>, or <rect> with optional fill mode.

type ShapeDef = {
  t: "path" | "circle" | "rect";
  d?: string;
  f?: 1;
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
};

export const ICONS: Record<string, ShapeDef[]> = {
  play: [{ t: "path", d: "M8 5v14l11-7z", f: 1 }],
  trophy: [
    { t: "path", d: "M7 4.5h10v4.5a5 5 0 0 1-10 0z" },
    { t: "path", d: "M7 6.5H4.2v1a3 3 0 0 0 3 3" },
    { t: "path", d: "M17 6.5h2.8v1a3 3 0 0 1-3 3" },
    { t: "path", d: "M9.5 18.5h5" },
    { t: "path", d: "M12 14v4.5" },
  ],
  target: [
    { t: "circle", cx: 12, cy: 12, r: 9 },
    { t: "circle", cx: 12, cy: 12, r: 5 },
    { t: "circle", cx: 12, cy: 12, r: 1.7, f: 1 },
  ],
  user: [
    { t: "circle", cx: 12, cy: 8, r: 4 },
    { t: "path", d: "M5 20.5c0-4 3-6.5 7-6.5s7 2.5 7 6.5" },
  ],
  flame: [{ t: "path", d: "M12 3c3.4 4.4 6 7.4 6 11a6 6 0 0 1-12 0c0-3.4 2.6-6.5 6-11z", f: 1 }],
  bolt: [{ t: "path", d: "M13 2L4 14h6l-1 8 11-13h-7z", f: 1 }],
  clock: [
    { t: "circle", cx: 12, cy: 12, r: 9 },
    { t: "path", d: "M12 7.5v5l3.3 2" },
  ],
  scale: [
    { t: "path", d: "M12 4.5v15" },
    { t: "path", d: "M8 19.5h8" },
    { t: "path", d: "M4 7.5h16" },
    { t: "circle", cx: 12, cy: 4, r: 1.4, f: 1 },
    { t: "path", d: "M4 7.5l-2.2 5h4.4z" },
    { t: "path", d: "M20 7.5l-2.2 5h4.4z" },
  ],
  users: [
    { t: "circle", cx: 9, cy: 8, r: 3.3 },
    { t: "path", d: "M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" },
    { t: "path", d: "M16 5.2a3.3 3.3 0 0 1 0 6.4" },
    { t: "path", d: "M18.5 14.7c1.9.6 3 2.2 3 4.8" },
  ],
  check: [{ t: "path", d: "M5 12.5l4.5 4.5L19 7" }],
  lock: [
    { t: "rect", x: 4.5, y: 10, width: 15, height: 10, rx: 2.4 },
    { t: "path", d: "M8 10V7.2a4 4 0 0 1 8 0V10" },
  ],
  star: [{ t: "path", d: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", f: 1 }],
  cap: [
    { t: "path", d: "M12 4l10 4-10 4-10-4z", f: 1 },
    { t: "path", d: "M6 10.5V15c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-4.5" },
  ],
  eye: [
    { t: "path", d: "M2 12s4-6.3 10-6.3 10 6.3 10 6.3-4 6.3-10 6.3S2 12 2 12z" },
    { t: "circle", cx: 12, cy: 12, r: 3 },
  ],
  trendUp: [
    { t: "path", d: "M3 17l6-6 4 4 7.5-7.5" },
    { t: "path", d: "M16 7.5h5v5" },
  ],
  face: [
    { t: "circle", cx: 12, cy: 12, r: 9 },
    { t: "circle", cx: 9, cy: 10, r: 1, f: 1 },
    { t: "circle", cx: 15, cy: 10, r: 1, f: 1 },
    { t: "path", d: "M9 15.5h6" },
  ],
  gem: [
    { t: "path", d: "M6 3h12l3 5-9 13L3 8z" },
    { t: "path", d: "M3 8h18" },
    { t: "path", d: "M9 3 6 8l6 13" },
    { t: "path", d: "M15 3l3 5-6 13" },
  ],
  chest: [
    { t: "path", d: "M4 11a8 8 0 0 1 16 0v8H4z" },
    { t: "path", d: "M3.2 11h17.6" },
    { t: "rect", x: 10.4, y: 11, width: 3.2, height: 4, rx: 1.2 },
  ],
  calendar: [
    { t: "rect", x: 3.5, y: 5, width: 17, height: 16, rx: 3 },
    { t: "path", d: "M3.5 9.5h17" },
    { t: "path", d: "M8 3v4" },
    { t: "path", d: "M16 3v4" },
  ],
  medal: [
    { t: "path", d: "M8.5 3l3.5 6 3.5-6" },
    { t: "circle", cx: 12, cy: 15, r: 6 },
    { t: "path", d: "M12 12.4l1 2 2.2.3-1.6 1.6.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.6 2.2-.3z", f: 1 },
  ],
  crown: [
    { t: "path", d: "M4 18h16l-1.2-8.6-4.3 4L12 6.4 9.5 13.4l-4.3-4z", f: 1 },
    { t: "path", d: "M4 20.6h16" },
  ],
  share: [
    { t: "circle", cx: 18, cy: 5, r: 2.6 },
    { t: "circle", cx: 6, cy: 12, r: 2.6 },
    { t: "circle", cx: 18, cy: 19, r: 2.6 },
    { t: "path", d: "M8.3 10.7l7.4-4.3" },
    { t: "path", d: "M8.3 13.3l7.4 4.3" },
  ],
  shield: [
    { t: "path", d: "M12 3l8 3v6c0 5-3.6 8-8 9-4.4-1-8-4-8-9V6z" },
    { t: "path", d: "M9 12l2 2 4-4" },
  ],
};

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: string;
  size: number;
  color?: string;
  strokeWidth?: number;
}

/** Reusable replacement for the original `this.icon(name, size, color, sw)` helper. */
export function Icon({ name, size, color, strokeWidth }: IconProps): JSX.Element | null {
  const def = ICONS[name];
  if (!def) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth || 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color, flex: "none", display: "block" }}
    >
      {def.map((sh, i) => {
        const { t, d, f, ...attr } = sh;
        const props: Record<string, unknown> = { key: i, ...attr };
        if (d) props.d = d;
        if (f) {
          props.fill = "currentColor";
          props.stroke = "none";
        }
        return createElement(t, props);
      })}
    </svg>
  );
}

/** Functional equivalent of the original `icon(name, size, color, sw)` call-site helper,
 * returning a React element directly (useful inside renderVals-style builder functions). */
export function icon(name: string, size: number, color?: string, sw?: number): JSX.Element | null {
  return <Icon name={name} size={size} color={color} strokeWidth={sw} />;
}

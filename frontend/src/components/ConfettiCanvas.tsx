export interface ConfettiCanvasProps {
  setCanvas: (el: HTMLCanvasElement | null) => void;
}

/** The `<canvas ref="{{ setCanvas }}">` host for confetti — fixed, full-screen, click-through. */
export function ConfettiCanvas({ setCanvas }: ConfettiCanvasProps) {
  return (
    <canvas
      ref={setCanvas}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 60 }}
    />
  );
}

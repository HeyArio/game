import { Mascot } from "./Mascot";
import { useAuth } from "../auth/AuthProvider";
import { isSupabaseConfigured } from "../lib/supabase";

// Google "G" mark — official 4-colour glyph, inline so we ship no extra asset.
function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block", flex: "none" }} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export interface SignInOverlayProps {
  /** Short, context-specific reason the guest is being asked to sign in. */
  reason?: string;
  onClose: () => void;
}

/** Lightweight modal that prompts a logged-out visitor to sign in (e.g. when
 *  they try to lock in an answer). Sign-in itself is the Google OAuth flow. */
export function SignInOverlay({ reason, onClose }: SignInOverlayProps) {
  const { signInWithGoogle } = useAuth();

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to continue"
      style={{
        position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, background: "rgba(38, 46, 30, .55)", backdropFilter: "blur(3px)", animation: "qfade .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: 380, background: "#fff",
          border: "2px solid #E4EAD8", borderBottomWidth: 5, borderRadius: 24,
          padding: "28px 24px 24px", textAlign: "center", boxShadow: "0 18px 50px rgba(0,0,0,.22)",
          animation: "qpop .35s ease both",
        }}
      >
        {/* close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: "none",
            background: "#F4F8EE", color: "#9AA08C", fontSize: 18, fontWeight: 800, cursor: "pointer", lineHeight: 1,
          }}
        >
          ×
        </button>

        <span style={{ display: "inline-flex", animation: "qbob 3s ease-in-out infinite" }}><Mascot size={64} mood="happy" /></span>

        <h2 style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 24, color: "#3C3C46", margin: "12px 0 0" }}>
          Sign in to lock it in
        </h2>
        <p style={{ fontWeight: 700, fontSize: 14.5, color: "#8E9582", lineHeight: 1.5, margin: "8px auto 0", maxWidth: 300 }}>
          {reason ?? "Create your free account to lock in your pick, see Arbi's verdict, and start a streak."}
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={!isSupabaseConfigured}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
            border: "none", background: "#58CC02", color: "#fff", padding: "15px 22px", borderRadius: 15,
            fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15.5, boxShadow: "0 4px 0 #46A302",
            cursor: isSupabaseConfigured ? "pointer" : "not-allowed", opacity: isSupabaseConfigured ? 1 : 0.6,
            marginTop: 20,
          }}
        >
          <span style={{ background: "#fff", borderRadius: 6, padding: 3, display: "inline-flex" }}><GoogleMark size={18} /></span>
          Continue with Google
        </button>

        <button
          onClick={onClose}
          style={{
            border: "none", background: "transparent", color: "#9AA08C", fontFamily: "'Nunito',sans-serif",
            fontWeight: 800, fontSize: 13.5, cursor: "pointer", marginTop: 14, padding: 4,
          }}
        >
          Keep looking around
        </button>

        {!isSupabaseConfigured && (
          <div style={{ marginTop: 12, fontWeight: 700, fontSize: 12, color: "#C0271F" }}>
            Supabase isn't configured — add your project URL + anon key to <code>.env</code>.
          </div>
        )}
      </div>
    </div>
  );
}

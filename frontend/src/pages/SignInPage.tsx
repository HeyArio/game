import { Mascot } from "../components/Mascot";
import { useAuth } from "../auth/AuthProvider";
import { isSupabaseConfigured } from "../lib/supabase";

// Google "G" mark — official 4-colour glyph, inline so we ship no extra asset.
function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block", flex: "none" }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function SignInPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(140% 80% at 50% -20%, #EAF7DD 0%, #F4F8EE 48%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(420px,100%)",
          background: "#fff",
          border: "2px solid #E4EAD8",
          borderBottomWidth: 4,
          borderRadius: 26,
          padding: "36px 30px 30px",
          textAlign: "center",
          animation: "qrise .45s ease both",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", animation: "qbob 3s ease-in-out infinite" }}>
          <Mascot size={84} mood="happy" />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "#58CC02",
              boxShadow: "0 3px 0 #46A302",
              fontFamily: "'Baloo 2',cursive",
              fontWeight: 800,
              fontSize: 22,
              color: "#fff",
            }}
          >
            Q
          </span>
          <span style={{ fontFamily: "'Baloo 2',cursive", fontWeight: 800, fontSize: 28, color: "#58A700" }}>Quorum</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#8E9582", marginTop: 8, lineHeight: 1.5 }}>
          One case a day. Back the sharpest answer and see if you land with Arbi.
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={!isSupabaseConfigured}
          style={{
            width: "100%",
            marginTop: 26,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            border: "2px solid #E4EAD8",
            borderBottomWidth: 4,
            background: "#fff",
            color: "#3C3C46",
            padding: "14px",
            borderRadius: 15,
            fontFamily: "'Nunito',sans-serif",
            fontWeight: 800,
            fontSize: 15,
            cursor: isSupabaseConfigured ? "pointer" : "not-allowed",
            opacity: isSupabaseConfigured ? 1 : 0.6,
          }}
        >
          <GoogleMark />
          Continue with Google
        </button>

        {!isSupabaseConfigured && (
          <div style={{ marginTop: 14, fontWeight: 700, fontSize: 12.5, color: "#C0392B", lineHeight: 1.5 }}>
            Supabase isn't configured yet. Copy <code>.env.example</code> to <code>.env</code> and add your project URL + anon key.
          </div>
        )}
      </div>
    </div>
  );
}

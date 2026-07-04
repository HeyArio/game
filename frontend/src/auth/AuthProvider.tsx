import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { track } from "../lib/analytics";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  /** Send a magic sign-in link. Resolves to an error message, or null on success. */
  signInWithEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Whether a session was already present — SIGNED_IN also fires on token
  // refresh and tab refocus, and only the none→session transition is a real
  // sign-in for funnel purposes.
  const hadSessionRef = useRef(false);

  useEffect(() => {
    // Pick up an existing session (e.g. after an OAuth redirect or a refresh).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) hadSessionRef.current = true;
      setSession(data.session);
      setLoading(false);
    });

    // Stay in sync with sign-in / sign-out / token-refresh events.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Completes the funnel pair with sign_in_start: a fresh sign-in only
      // (returning from the OAuth redirect / magic link), never a refresh.
      if (event === "SIGNED_IN" && !hadSessionRef.current) track("sign_in_success");
      hadSessionRef.current = !!s;
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithGoogle: async () => {
        track("sign_in_start", { method: "google" });
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (error) console.error("[auth] Google sign-in failed:", error.message);
      },
      signInWithEmail: async (email: string) => {
        track("sign_in_start", { method: "email" });
        // Magic link: no password to invent, and the link lands back on the
        // origin where the stashed guest pick / referral get redeemed.
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          console.error("[auth] Email sign-in failed:", error.message);
          return error.message;
        }
        return null;
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("[auth] Sign-out failed:", error.message);
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

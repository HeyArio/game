import { useEffect, useState } from "react";
import { generateClientCase, type ClientCase } from "../lib/providers";

export type ClientCaseStatus = "loading" | "active" | "error";

/**
 * TESTING-ONLY hook: generates a case in the browser via the LLM providers.
 * Used when a provider API key is set, in place of useDailyCase (which reads
 * from the database).
 */
export function useClientCase() {
  const [status, setStatus] = useState<ClientCaseStatus>("loading");
  const [clientCase, setClientCase] = useState<ClientCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    generateClientCase()
      .then((c) => { if (!cancelled) { setClientCase(c); setStatus("active"); } })
      .catch((e) => { if (!cancelled) { setError(e?.message ?? String(e)); setStatus("error"); } });
    return () => { cancelled = true; };
  }, []);

  return { status, clientCase, error };
}

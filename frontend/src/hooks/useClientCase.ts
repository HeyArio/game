import { useEffect, useState } from "react";
import { generateClientCase, type ClientCase } from "../lib/nvidia";

export type ClientCaseStatus = "loading" | "active" | "error";

/**
 * TESTING-ONLY hook: generates a case in the browser via the NVIDIA models.
 * Used when VITE_NVIDIA_API_KEY is set, in place of useDailyCase (which reads
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

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface CaseOption {
  id: string;
  letter: string;       // A B C D
  model_name: string;   // display name, e.g. "Llama 3.3 70B"
  pick: string;         // short headline
  rationale: string;    // full answer text
  crowd_pct: number;    // seed percentage (replaced by live_pct after vote)
}

export interface DailyCase {
  id: string;
  case_no: number;
  question: string;
  category: string;
  opens_at: string;
  closes_at: string;
  options: CaseOption[];
}

export type CaseStatus = "loading" | "active" | "no_case" | "error";

export interface UseDailyCaseResult {
  status: CaseStatus;
  dailyCase: DailyCase | null;
  error: string | null;
}

export function useDailyCase(): UseDailyCaseResult {
  const [status, setStatus]       = useState<CaseStatus>("loading");
  const [dailyCase, setDailyCase] = useState<DailyCase | null>(null);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Order by case_no desc + limit(1) so that if more than one case is
        // open at once (e.g. a manually triggered case overlapping the
        // previous 24h window) we show the newest rather than erroring out.
        const { data, error: err } = await supabase
          .from("today_case")
          .select("*")
          .order("case_no", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (err) {
          // PGRST116 = no rows (no open case today)
          if (err.code === "PGRST116") { setStatus("no_case"); return; }
          throw err;
        }

        // maybeSingle() returns null (no error) when there are no open cases.
        if (!data) { setStatus("no_case"); return; }

        // `options` comes back as JSON (from the view's json_agg)
        const raw = data as any;
        const options: CaseOption[] = typeof raw.options === "string"
          ? JSON.parse(raw.options)
          : raw.options ?? [];

        setDailyCase({
          id:        raw.id,
          case_no:   raw.case_no,
          question:  raw.question,
          category:  raw.category,
          opens_at:  raw.opens_at,
          closes_at: raw.closes_at,
          options,
        });
        setStatus("active");
      } catch (e: any) {
        if (!cancelled) { setError(e?.message ?? String(e)); setStatus("error"); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { status, dailyCase, error };
}

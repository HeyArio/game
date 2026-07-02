import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Confidence } from "../state/types";

export interface VoteResult {
  wasCorrect: boolean;
  xpEarned: number;
  votedOptionId: string;
  judgeOptionId: string;
  judgeOptionLetter: string;
  judgeReasoning: string | null;
  crowdLeaderLetter: string | null;
  crowdCorrect: boolean;
  crowdBonus: number;
  /** False when there weren't enough real votes yet to grade the crowd bet. */
  crowdGraded?: boolean;
  confidence: Confidence;
  alreadyVoted: boolean;
  options: {
    id: string;
    letter: string;
    model_name: string;
    pick: string;
    rationale: string;
    is_judge_pick: boolean;
    live_pct: number;
  }[];
}

export interface UseVoteResult {
  submitting: boolean;
  voteResult: VoteResult | null;
  error: string | null;
  submitVote: (
    caseId: string,
    optionId: string,
    confidence?: Confidence,
    crowdGuessOptionId?: string | null,
  ) => Promise<VoteResult | null>;
  clearResult: () => void;
}

export function useVote(): UseVoteResult {
  const [submitting, setSubmitting]   = useState(false);
  const [voteResult, setVoteResult]   = useState<VoteResult | null>(null);
  const [error, setError]             = useState<string | null>(null);

  async function submitVote(
    caseId: string,
    optionId: string,
    confidence: Confidence = "med",
    crowdGuessOptionId: string | null = null,
  ): Promise<VoteResult | null> {
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      const res = await supabase.functions.invoke("submit-vote", {
        body: { case_id: caseId, option_id: optionId, confidence, crowd_guess_option_id: crowdGuessOptionId },
      });

      if (res.error) throw res.error;

      const result = res.data as VoteResult;
      setVoteResult(result);
      return result;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  function clearResult() {
    setVoteResult(null);
    setError(null);
  }

  return { submitting, voteResult, error, submitVote, clearResult };
}

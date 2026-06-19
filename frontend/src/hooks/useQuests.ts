import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { QuestStateRow } from "../state/types";

export interface ClaimResult {
  ok: boolean;
  already?: boolean;
  reward_xp?: number;
  total_xp?: number;
  level?: number;
  reason?: string;
}

export interface UseQuestsResult {
  quests: QuestStateRow[];
  loading: boolean;
  claimingKey: string | null;
  refresh: () => Promise<void>;
  claim: (questKey: string) => Promise<ClaimResult | null>;
}

/**
 * Live quest state + claiming, backed by the get_quest_state / claim_quest RPCs.
 * Progress and reward grants are computed server-side, so this hook only reads
 * the truth and triggers claims — it never decides completion itself.
 */
export function useQuests(): UseQuestsResult {
  const [quests, setQuests] = useState<QuestStateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_quest_state");
    if (!error && data) setQuests(data as QuestStateRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const claim = useCallback(async (questKey: string): Promise<ClaimResult | null> => {
    setClaimingKey(questKey);
    try {
      const { data, error } = await supabase.rpc("claim_quest", { p_quest_key: questKey });
      if (error) return null;
      await refresh();
      return data as ClaimResult;
    } finally {
      setClaimingKey(null);
    }
  }, [refresh]);

  return { quests, loading, claimingKey, refresh, claim };
}

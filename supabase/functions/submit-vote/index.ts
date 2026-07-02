/**
 * submit-vote
 *
 * Server-side vote handler. Hides the judge verdict until called, then:
 *   1. Validates the vote (case open, not already voted, valid option)
 *   2. Reveals whether the chosen option is the judge's pick
 *   3. Awards XP based on the player's confidence wager:
 *        low  → correct 30 / wrong 10
 *        med  → correct 50 / wrong  5
 *        high → correct 100 / wrong 0
 *      plus a +15 "beat the crowd" bonus if their crowd guess matches the
 *      current crowd leader.
 *   4. Updates user_progress (total_xp, daily_xp, streak, best_streak)
 *   5. Inserts the vote row (with confidence + crowd guess)
 *   6. Returns the full result: judge pick + reasoning, crowd leader, live
 *      crowd percentages, and the XP breakdown.
 *
 * Called from the frontend with the user's Supabase JWT in Authorization header.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CROWD_BONUS = 15;

// The crowd bet is only graded against REAL votes. Below this many prior real
// votes on the case, there is no crowd to read yet — the bet is returned as
// ungraded (no bonus, no "missed" either) instead of being scored against the
// seeded/fabricated crowd_pct numbers the case is generated with.
const MIN_CROWD_SAMPLE = 5;

type Confidence = "low" | "med" | "high";
const XP_TABLE: Record<Confidence, { correct: number; wrong: number }> = {
  low:  { correct: 30,  wrong: 10 },
  med:  { correct: 50,  wrong: 5  },
  high: { correct: 100, wrong: 0  },
};
function baseXp(correct: boolean, confidence: Confidence): number {
  const c = XP_TABLE[confidence] ?? XP_TABLE.med;
  return correct ? c.correct : c.wrong;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  // Authenticated client (respects RLS — reads session from JWT)
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Service-role client for privileged writes
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let caseId: string, optionId: string, confidence: Confidence, crowdGuessOptionId: string | null;
  try {
    const body = await req.json();
    caseId   = body.case_id;
    optionId = body.option_id;
    confidence = (["low", "med", "high"].includes(body.confidence) ? body.confidence : "med") as Confidence;
    crowdGuessOptionId = body.crowd_guess_option_id ?? null;
    if (!caseId || !optionId) throw new Error("Missing case_id or option_id");
  } catch (e) {
    return json({ error: String(e) }, 400);
  }

  // Get the authenticated user
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Not authenticated" }, 401);

  // --- Validate the case is open ---
  const { data: caseRow, error: caseErr } = await adminClient
    .from("daily_cases")
    .select("id, case_no, closes_at")
    .eq("id", caseId)
    .lte("opens_at", new Date().toISOString())
    .gte("closes_at", new Date().toISOString())
    .single();
  if (caseErr || !caseRow) return json({ error: "Case not found or not open" }, 404);

  const ctx = await getCaseContext(adminClient, caseId);

  // --- Already voted? Return the stored result so the reveal can be rebuilt ---
  const { data: existingVote } = await adminClient
    .from("votes")
    .select("option_id, was_correct, xp_earned, confidence, crowd_guess_option_id, crowd_correct")
    .eq("user_id", user.id)
    .eq("case_id", caseId)
    .maybeSingle();

  if (existingVote) {
    return json({
      ...buildPayload(ctx, {
        votedOptionId:      existingVote.option_id,
        wasCorrect:         existingVote.was_correct ?? false,
        xpEarned:           existingVote.xp_earned ?? 0,
        confidence:         (existingVote.confidence as Confidence) ?? "med",
        crowdGuessOptionId: existingVote.crowd_guess_option_id ?? null,
        crowdCorrect:       existingVote.crowd_correct ?? false,
      }),
      alreadyVoted: true,
    });
  }

  // --- Validate option belongs to this case ---
  const { data: option, error: optErr } = await adminClient
    .from("case_options")
    .select("id, letter, is_judge_pick")
    .eq("id", optionId)
    .eq("case_id", caseId)
    .single();
  if (optErr || !option) return json({ error: "Invalid option" }, 400);

  const wasCorrect = option.is_judge_pick;
  // Grade the crowd bet against the leader among REAL votes only, and only once
  // enough of them exist — never against the seeded crowd_pct fiction.
  const crowdGraded = ctx.realVoteCount >= MIN_CROWD_SAMPLE && !!ctx.realCrowdLeaderOptionId;
  const crowdCorrect = crowdGraded && !!crowdGuessOptionId && crowdGuessOptionId === ctx.realCrowdLeaderOptionId;
  const xpEarned = baseXp(wasCorrect, confidence) + (crowdCorrect ? CROWD_BONUS : 0);

  // --- Record the vote + update progress atomically (single transaction) ---
  // record_vote returns false if a row already existed (incl. a concurrent
  // double-submit), in which case nothing was written — fall through to the
  // stored-result path instead of returning a constraint error.
  const { data: inserted, error: voteErr } = await adminClient.rpc("record_vote", {
    p_user_id:               user.id,
    p_case_id:               caseId,
    p_option_id:             optionId,
    p_was_correct:           wasCorrect,
    p_xp_earned:             xpEarned,
    p_confidence:            confidence,
    p_crowd_guess_option_id: crowdGuessOptionId,
    p_crowd_correct:         crowdCorrect,
  });
  if (voteErr) return json({ error: voteErr.message }, 500);

  if (inserted === false) {
    const { data: ev } = await adminClient
      .from("votes")
      .select("option_id, was_correct, xp_earned, confidence, crowd_guess_option_id, crowd_correct")
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .maybeSingle();
    return json({
      ...buildPayload(ctx, {
        votedOptionId:      ev?.option_id ?? optionId,
        wasCorrect:         ev?.was_correct ?? false,
        xpEarned:           ev?.xp_earned ?? 0,
        confidence:         (ev?.confidence as Confidence) ?? "med",
        crowdGuessOptionId: ev?.crowd_guess_option_id ?? null,
        crowdCorrect:       ev?.crowd_correct ?? false,
      }),
      alreadyVoted: true,
    });
  }

  return json({
    ...buildPayload(ctx, {
      votedOptionId: optionId, wasCorrect, xpEarned, confidence, crowdGuessOptionId, crowdCorrect, crowdGraded,
    }),
    alreadyVoted: false,
  });
});

interface CaseContext {
  options: any[];
  judgeOptionId: string | null;
  judgeOptionLetter: string | null;
  judgeReasoning: string | null;
  crowdLeaderOptionId: string | null;
  crowdLeaderLetter: string | null;
  /** Total REAL votes cast on this case (excludes seeded percentages). */
  realVoteCount: number;
  /** Leader among real votes only — the honest target for the crowd bet. */
  realCrowdLeaderOptionId: string | null;
}

// Everything about the case that's the same regardless of who voted: enriched
// options (with live crowd %), the judge pick + reasoning, and the crowd leader.
async function getCaseContext(admin: ReturnType<typeof createClient>, caseId: string): Promise<CaseContext> {
  const { data: options } = await admin
    .from("case_options")
    .select("id, letter, model_name, pick, rationale, is_judge_pick, crowd_pct")
    .eq("case_id", caseId)
    .order("letter");

  const { data: caseRow } = await admin
    .from("daily_cases")
    .select("judge_reasoning")
    .eq("id", caseId)
    .single();

  const { data: summary } = await admin
    .from("case_vote_summary")
    .select("option_id, pct, vote_count")
    .eq("case_id", caseId);

  const crowdMap: Record<string, number> = {};
  const voteCounts: Record<string, number> = {};
  let realVoteCount = 0;
  (summary ?? []).forEach((s: { option_id: string; pct: number; vote_count: number }) => {
    crowdMap[s.option_id] = s.pct;
    voteCounts[s.option_id] = s.vote_count ?? 0;
    realVoteCount += s.vote_count ?? 0;
  });

  const enriched = (options ?? []).map((o: any) => ({
    ...o,
    live_pct: crowdMap[o.id] ?? o.crowd_pct ?? 0,
  }));

  const judge = enriched.find((o: any) => o.is_judge_pick);

  // Leader among REAL votes only (ties broken by letter) — used for grading the
  // crowd bet. Null when nobody has actually voted yet.
  const realLeader = realVoteCount > 0
    ? [...enriched].sort(
        (a, b) => ((voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0)) || a.letter.localeCompare(b.letter)
      )[0]
    : null;

  // Display leader = highest live % (real votes when they exist, seeds until
  // then), tie-broken by seeded crowd_pct then letter. Once real votes exist,
  // prefer the real leader so the CROWD tile and the graded bet always agree.
  const blendLeader = [...enriched].sort(
    (a, b) => (b.live_pct - a.live_pct) || (b.crowd_pct - a.crowd_pct) || a.letter.localeCompare(b.letter)
  )[0];
  const leader = realLeader ?? blendLeader;

  return {
    options: enriched,
    judgeOptionId: judge?.id ?? null,
    judgeOptionLetter: judge?.letter ?? null,
    judgeReasoning: (caseRow as any)?.judge_reasoning ?? null,
    crowdLeaderOptionId: leader?.id ?? null,
    crowdLeaderLetter: leader?.letter ?? null,
    realVoteCount,
    realCrowdLeaderOptionId: realLeader?.id ?? null,
  };
}

function buildPayload(ctx: CaseContext, v: {
  votedOptionId: string;
  wasCorrect: boolean;
  xpEarned: number;
  confidence: Confidence;
  crowdGuessOptionId: string | null;
  crowdCorrect: boolean;
  /** Omitted on the already-voted replay paths (grading happened at vote time). */
  crowdGraded?: boolean;
}) {
  return {
    wasCorrect:        v.wasCorrect,
    xpEarned:          v.xpEarned,
    votedOptionId:     v.votedOptionId,
    confidence:        v.confidence,
    judgeOptionId:     ctx.judgeOptionId,
    judgeOptionLetter: ctx.judgeOptionLetter,
    judgeReasoning:    ctx.judgeReasoning,
    crowdGuessOptionId: v.crowdGuessOptionId,
    crowdLeaderOptionId: ctx.crowdLeaderOptionId,
    crowdLeaderLetter:  ctx.crowdLeaderLetter,
    crowdCorrect:       v.crowdCorrect,
    crowdBonus:         v.crowdCorrect ? CROWD_BONUS : 0,
    crowdGraded:        v.crowdGraded ?? true,
    options:            ctx.options,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

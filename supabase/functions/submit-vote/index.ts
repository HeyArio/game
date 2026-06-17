/**
 * submit-vote
 *
 * Server-side vote handler. Hides the judge verdict until called, then:
 *   1. Validates the vote (case open, not already voted, valid option)
 *   2. Reveals whether the chosen option is the judge's pick
 *   3. Awards XP (50 if correct, 10 if not)
 *   4. Updates user_progress (total_xp, daily_xp, streak, best_streak)
 *   5. Inserts the vote row
 *   6. Returns the full result including which option the judge picked
 *      and live crowd percentages
 *
 * Called from the frontend with the user's Supabase JWT in Authorization header.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const XP_CORRECT = 50;
const XP_WRONG   = 10;

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

  // Service-role client for privileged writes (XP updates, vote insert bypassing per-user checks)
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let caseId: string, optionId: string;
  try {
    const body = await req.json();
    caseId   = body.case_id;
    optionId = body.option_id;
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

  // --- Check not already voted ---
  const { data: existingVote } = await adminClient
    .from("votes")
    .select("id, option_id, was_correct, xp_earned")
    .eq("user_id", user.id)
    .eq("case_id", caseId)
    .maybeSingle();

  if (existingVote) {
    // Return the previous result so the frontend can reconstruct the reveal state
    const result = await buildResult(adminClient, caseId, existingVote.option_id, existingVote.was_correct!, existingVote.xp_earned!);
    return json({ ...result, alreadyVoted: true });
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
  const xpEarned   = wasCorrect ? XP_CORRECT : XP_WRONG;

  // --- Insert the vote ---
  const { error: voteErr } = await adminClient.from("votes").insert({
    user_id:     user.id,
    case_id:     caseId,
    option_id:   optionId,
    was_correct: wasCorrect,
    xp_earned:   xpEarned,
  });
  if (voteErr) return json({ error: voteErr.message }, 500);

  // --- Update user_progress ---
  await adminClient.rpc("update_user_progress_after_vote", {
    p_user_id:    user.id,
    p_xp_earned:  xpEarned,
    p_was_correct: wasCorrect,
  });

  const result = await buildResult(adminClient, caseId, optionId, wasCorrect, xpEarned);
  return json({ ...result, alreadyVoted: false });
});

async function buildResult(
  admin: ReturnType<typeof createClient>,
  caseId: string,
  votedOptionId: string,
  wasCorrect: boolean,
  xpEarned: number,
) {
  // Fetch all options for this case (including which is the judge pick)
  const { data: options } = await admin
    .from("case_options")
    .select("id, letter, model_name, pick, rationale, is_judge_pick, crowd_pct")
    .eq("case_id", caseId)
    .order("letter");

  // Live crowd percentages from actual votes
  const { data: summary } = await admin
    .from("case_vote_summary")
    .select("option_id, pct")
    .eq("case_id", caseId);

  const crowdMap: Record<string, number> = {};
  (summary ?? []).forEach((s: { option_id: string; pct: number }) => {
    crowdMap[s.option_id] = s.pct;
  });

  // Fall back to seeded crowd_pct values if no votes yet
  const enrichedOptions = (options ?? []).map((o: any) => ({
    ...o,
    live_pct: crowdMap[o.id] ?? o.crowd_pct ?? 0,
  }));

  const judgeOption = enrichedOptions.find((o: any) => o.is_judge_pick);

  return {
    wasCorrect,
    xpEarned,
    votedOptionId,
    judgeOptionId:  judgeOption?.id ?? null,
    judgeOptionLetter: judgeOption?.letter ?? null,
    options: enrichedOptions,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

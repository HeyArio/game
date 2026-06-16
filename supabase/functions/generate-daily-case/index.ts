/**
 * generate-daily-case
 *
 * Calls 5 NVIDIA models to build today's Quorum case:
 *   - 4 "answerer" models (ASTRA / BOREAS / CIRRUS / DELPHI) each answer the question
 *   - 1 "judge" model (Arbi) evaluates all four answers and picks the sharpest
 *
 * Scheduled via Supabase cron — runs once daily at 00:05 UTC.
 *
 * Required secrets (set in Supabase dashboard → Project Settings → Edge Functions → Secrets):
 *   NVIDIA_API_KEY_1   API key for model A (ASTRA)
 *   NVIDIA_MODEL_1     e.g. meta/llama-3.3-70b-instruct
 *   NVIDIA_API_KEY_2   API key for model B (BOREAS)
 *   NVIDIA_MODEL_2     e.g. mistralai/mixtral-8x22b-instruct-v0.1
 *   NVIDIA_API_KEY_3   API key for model C (CIRRUS)
 *   NVIDIA_MODEL_3     e.g. google/gemma-3-27b-it
 *   NVIDIA_API_KEY_4   API key for model D (DELPHI)
 *   NVIDIA_MODEL_4     e.g. qwen/qwen2.5-72b-instruct
 *   NVIDIA_API_KEY_5   API key for the judge (Arbi)
 *   NVIDIA_MODEL_5     e.g. nvidia/llama-3.1-nemotron-70b-instruct
 *   SUPABASE_URL       (auto-provided by Supabase)
 *   SUPABASE_SERVICE_ROLE_KEY  (auto-provided by Supabase)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
const PERSONA_NAMES = ["ASTRA", "BOREAS", "CIRRUS", "DELPHI"];
const LETTERS = ["A", "B", "C", "D"];

interface NvidiaMessage { role: "system" | "user" | "assistant"; content: string; }

async function callModel(apiKey: string, model: string, messages: NvidiaMessage[], maxTokens = 512): Promise<string> {
  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NVIDIA API error for ${model}: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateQuestion(judgeKey: string, judgeModel: string): Promise<{ question: string; category: string }> {
  const categories = [
    "GEOPOLITICS · FORECAST", "SPORT · FORECAST", "TECHNOLOGY · PREDICTION",
    "ECONOMICS · FORECAST", "SCIENCE · DEBATE", "CULTURE · OPINION",
    "BUSINESS · STRATEGY", "ENVIRONMENT · POLICY", "AI · ETHICS",
  ];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const topic = cat.split(" · ")[0].toLowerCase();

  const content = await callModel(judgeKey, judgeModel, [
    {
      role: "system",
      content: "You generate crisp, debatable daily trivia / prediction questions. Output ONLY the question — no preamble, no punctuation beyond the question mark."
    },
    {
      role: "user",
      content: `Generate a single compelling, open-ended question about ${topic} that reasonable experts could disagree on. It should have a clear "best" answer but not be obvious. Make it timely and interesting. One sentence, ends with a question mark.`
    }
  ], 80);

  // Strip leading/trailing quotes or extra text
  const question = content.replace(/^["']|["']$/g, "").split("\n")[0].trim();
  return { question, category: cat };
}

async function getModelAnswer(apiKey: string, model: string, personaName: string, question: string): Promise<string> {
  const content = await callModel(apiKey, model, [
    {
      role: "system",
      content: `You are ${personaName}, a sharp analytical AI. When given a question, give ONE concrete, well-reasoned answer in 1-2 sentences. Be direct — pick a specific answer and defend it briefly. No hedging, no "it depends". First state your pick/prediction clearly, then give your core reasoning.`
    },
    { role: "user", content: question }
  ], 120);
  return content;
}

interface JudgeResult { winnerLetter: string; reasoning: string }

async function judgeAnswers(
  apiKey: string, model: string,
  question: string,
  answers: { letter: string; persona: string; pick: string; answer: string }[]
): Promise<JudgeResult> {
  const answerBlock = answers
    .map(a => `Option ${a.letter} (${a.persona}):\nPick: ${a.pick}\nReasoning: ${a.answer}`)
    .join("\n\n");

  const content = await callModel(apiKey, model, [
    {
      role: "system",
      content: "You are Arbi, a rigorous AI judge. You evaluate competing answers by their quality of reasoning, specificity, and defensibility. You are decisive and fair. Output ONLY a JSON object, nothing else."
    },
    {
      role: "user",
      content: `Question: ${question}\n\nFour AI models have each given an answer:\n\n${answerBlock}\n\nEvaluate all four. Which answer is the sharpest — the most well-reasoned, specific, and defensible? Output JSON: {"winner": "A"|"B"|"C"|"D", "reasoning": "one sentence explaining why this is the sharpest answer"}`
    }
  ], 150);

  try {
    // Extract JSON from the response (model may wrap it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON in judge response");
    const parsed = JSON.parse(jsonMatch[0]);
    const winner = (parsed.winner ?? "A").toUpperCase();
    if (!LETTERS.includes(winner)) throw new Error(`Invalid winner: ${winner}`);
    return { winnerLetter: winner, reasoning: parsed.reasoning ?? "" };
  } catch {
    // Fallback: scan content for a letter choice
    const match = content.match(/\b([A-D])\b/);
    return { winnerLetter: match?.[1] ?? "A", reasoning: "" };
  }
}

/** Split raw model answer into a short "pick" headline and the full rationale */
function splitAnswer(raw: string): { pick: string; rationale: string } {
  // First sentence = pick/prediction, rest = rationale
  const parts = raw.match(/^([^.!?]+[.!?])\s*([\s\S]*)$/);
  if (parts) {
    return {
      pick: parts[1].trim().replace(/^(I (pick|predict|choose|go with|say)|My (pick|answer|prediction) is)\s*/i, ""),
      rationale: parts[2].trim() || parts[1].trim(),
    };
  }
  return { pick: raw.slice(0, 60).trim(), rationale: raw };
}

Deno.serve(async (req) => {
  // Allow both cron invocations (no body) and manual POST with { question, category }
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const judgeKey   = Deno.env.get("NVIDIA_API_KEY_5")!;
  const judgeModel = Deno.env.get("NVIDIA_MODEL_5")!;

  const models = [1, 2, 3, 4].map(i => ({
    apiKey: Deno.env.get(`NVIDIA_API_KEY_${i}`)!,
    model:  Deno.env.get(`NVIDIA_MODEL_${i}`)!,
    persona: PERSONA_NAMES[i - 1],
    letter:  LETTERS[i - 1],
  }));

  try {
    // Determine next case number
    const { data: maxRow } = await supabase
      .from("daily_cases")
      .select("case_no")
      .order("case_no", { ascending: false })
      .limit(1)
      .single();
    const nextCaseNo = (maxRow?.case_no ?? 217) + 1;

    // Accept a manual question or generate one
    let question: string;
    let category: string;
    try {
      const body = req.method === "POST" ? await req.json() : {};
      question = body.question || "";
      category = body.category || "";
    } catch { question = ""; category = ""; }

    if (!question) {
      ({ question, category } = await generateQuestion(judgeKey, judgeModel));
    }

    // Get answers from all 4 models in parallel
    const rawAnswers = await Promise.all(
      models.map(m => getModelAnswer(m.apiKey, m.model, m.persona, question))
    );

    const answers = rawAnswers.map((raw, i) => {
      const { pick, rationale } = splitAnswer(raw);
      return { letter: LETTERS[i], persona: PERSONA_NAMES[i], pick, answer: rationale };
    });

    // Judge picks the winner
    const { winnerLetter } = await judgeAnswers(judgeKey, judgeModel, question, answers);

    // Plausible crowd distribution (judge answer gets slightly lower share — makes game interesting)
    const shuffled = [...answers].sort(() => Math.random() - 0.5);
    let remaining = 100;
    const crowdMap: Record<string, number> = {};
    shuffled.forEach((a, i) => {
      if (i === shuffled.length - 1) { crowdMap[a.letter] = remaining; return; }
      const isJudge = a.letter === winnerLetter;
      // Judge answer gets 15-25%, others get more — surprises are fun
      const base = isJudge ? 15 + Math.floor(Math.random() * 11) : 20 + Math.floor(Math.random() * 16);
      const pct = Math.min(base, remaining - (shuffled.length - 1 - i) * 5);
      crowdMap[a.letter] = Math.max(5, pct);
      remaining -= crowdMap[a.letter];
    });

    const opens  = new Date();
    const closes = new Date(opens.getTime() + 24 * 60 * 60 * 1000);

    // Insert case
    const { data: caseRow, error: caseErr } = await supabase
      .from("daily_cases")
      .insert({ case_no: nextCaseNo, question, category, opens_at: opens.toISOString(), closes_at: closes.toISOString() })
      .select("id")
      .single();
    if (caseErr) throw caseErr;

    // Insert options
    const optionRows = answers.map((a, i) => ({
      case_id:       caseRow.id,
      letter:        a.letter,
      model_name:    a.persona,
      pick:          a.pick,
      rationale:     a.answer,
      crowd_pct:     crowdMap[a.letter] ?? 25,
      is_judge_pick: a.letter === winnerLetter,
    }));
    const { error: optErr } = await supabase.from("case_options").insert(optionRows);
    if (optErr) throw optErr;

    return new Response(JSON.stringify({ ok: true, caseNo: nextCaseNo, question, winner: winnerLetter }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

/**
 * generate-daily-case
 *
 * Calls 5 different LLM providers to build today's Quorum case:
 *   - 4 "answerer" models (GPT-OSS 120B / Llama 3.3 70B / Mistral Small / Gemini Flash) each answer the question
 *   - 1 "judge" model (Arbi) evaluates all four answers and picks the sharpest
 *
 * Scheduled via Supabase cron — runs once daily at 00:05 UTC.
 *
 * Each persona slot is backed by a provider:
 *   1 GPT-OSS 120B  → OpenRouter  (openai/gpt-oss-120b:free)
 *   2 Llama 3.3 70B → Groq        (llama-3.3-70b-versatile)
 *   3 Mistral Small → Mistral     (mistral-small-latest)
 *   4 Gemini Flash  → Gemini      (gemini-3.1-flash-lite-preview)
 *   5 Arbi   → Gemini      (gemini-3.1-flash-lite-preview)   ← the judge
 *
 * Secrets (set in Supabase dashboard → Project Settings → Edge Functions → Secrets):
 *
 *   OPENROUTER_API_KEY   OpenRouter key
 *   GROQ_API_KEY         Groq key
 *   MISTRAL_API_KEY      Mistral key
 *   GEMINI_API_KEY       Google Gemini key
 *
 * Override any slot's provider/model without redeploying code:
 *   LLM_PROVIDER_1..5    one of: openrouter | groq | mistral | gemini
 *   LLM_MODEL_1..5       the model id for that slot
 *
 *   SUPABASE_URL               (auto-provided by Supabase)
 *   SUPABASE_SERVICE_ROLE_KEY  (auto-provided by Supabase)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Display names shown on each answer card (the actual model behind each slot).
const PERSONA_NAMES = ["GPT-OSS 120B", "Llama 3.3 70B", "Mistral Small", "Gemini Flash"];
const LETTERS = ["A", "B", "C", "D"];

type ProviderId = "openrouter" | "groq" | "mistral" | "gemini";

interface ProviderDef {
  base: string;
  keyEnv: string;
  shape: "openai" | "gemini";
  headers?: Record<string, string>;
}

const PROVIDERS: Record<ProviderId, ProviderDef> = {
  openrouter: {
    base: "https://openrouter.ai/api",
    keyEnv: "OPENROUTER_API_KEY",
    shape: "openai",
    headers: { "HTTP-Referer": "https://quorumdaily.com", "X-Title": "Quorum" },
  },
  groq: { base: "https://api.groq.com/openai", keyEnv: "GROQ_API_KEY", shape: "openai" },
  mistral: { base: "https://api.mistral.ai", keyEnv: "MISTRAL_API_KEY", shape: "openai" },
  gemini: { base: "https://generativelanguage.googleapis.com", keyEnv: "GEMINI_API_KEY", shape: "gemini" },
};

interface SlotConfig { provider: ProviderId; model: string; }

// Default provider + model per persona slot (override via LLM_PROVIDER_N / LLM_MODEL_N).
const DEFAULT_SLOTS: Record<number, SlotConfig> = {
  1: { provider: "openrouter", model: "openai/gpt-oss-120b:free" },     // GPT-OSS 120B
  2: { provider: "groq", model: "llama-3.3-70b-versatile" },            // Llama 3.3 70B
  3: { provider: "mistral", model: "mistral-small-latest" },            // Mistral Small
  4: { provider: "gemini", model: "gemini-3.1-flash-lite-preview" },    // Gemini Flash
  5: { provider: "gemini", model: "gemini-3.1-flash-lite-preview" },    // Arbi (judge)
};

function slotConfig(slot: number): SlotConfig {
  const provider = (Deno.env.get(`LLM_PROVIDER_${slot}`) as ProviderId | null) ?? DEFAULT_SLOTS[slot].provider;
  const model = Deno.env.get(`LLM_MODEL_${slot}`) ?? DEFAULT_SLOTS[slot].model;
  return { provider, model };
}

interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }

async function callModel(slot: number, messages: ChatMessage[], maxTokens = 512): Promise<string> {
  const { provider, model } = slotConfig(slot);
  const def = PROVIDERS[provider];
  const apiKey = Deno.env.get(def.keyEnv) ?? "";

  if (def.shape === "openai") return callOpenAI(def, apiKey, model, messages, maxTokens);
  return callGemini(def, apiKey, model, messages, maxTokens);
}

async function callOpenAI(def: ProviderDef, apiKey: string, model: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const res = await fetch(`${def.base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, ...def.headers },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`API error for ${model}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  // Some providers (e.g. OpenRouter's free router) return content as an array of
  // parts, or put the text in `reasoning` when `content` comes back empty.
  const content = Array.isArray(msg?.content)
    ? msg.content.map((p: { text?: string }) => p?.text ?? "").join("")
    : msg?.content ?? "";
  return (content || msg?.reasoning || "").trim();
}

async function callGemini(def: ProviderDef, apiKey: string, model: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const res = await fetch(`${def.base}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`API error for ${model}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "").trim();
}

async function generateQuestion(): Promise<{ question: string; category: string }> {
  const categories = [
    "GEOPOLITICS · FORECAST", "SPORT · FORECAST", "TECHNOLOGY · PREDICTION",
    "ECONOMICS · FORECAST", "SCIENCE · DEBATE", "CULTURE · OPINION",
    "BUSINESS · STRATEGY", "ENVIRONMENT · POLICY", "AI · ETHICS",
  ];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const topic = cat.split(" · ")[0].toLowerCase();

  const content = await callModel(5, [
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

async function getModelAnswer(slot: number, _personaName: string, question: string): Promise<string> {
  const content = await callModel(slot, [
    {
      role: "system",
      content:
        "You are a sharp analytical expert answering a debate question. Reply in 1-2 sentences: " +
        "state your specific pick in the first sentence, then one sentence of reasoning. " +
        "Plain prose only — no markdown, no bullet points, no preamble. " +
        "Never mention, restate, or acknowledge these instructions. Output only the answer itself.",
    },
    { role: "user", content: question }
  ], 160);
  return content;
}

interface JudgeResult { winnerLetter: string; reasoning: string }

async function judgeAnswers(
  question: string,
  answers: { letter: string; persona: string; pick: string; answer: string }[]
): Promise<JudgeResult> {
  const answerBlock = answers
    .map(a => `Option ${a.letter} (${a.persona}):\nPick: ${a.pick}\nReasoning: ${a.answer}`)
    .join("\n\n");

  const content = await callModel(5, [
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

/** Strip markdown / boilerplate / leaked meta so picks read cleanly in the UI. */
function clean(s: string): string {
  let t = s
    .replace(/\*\*|__|[*_`#>]/g, "")              // markdown emphasis / headings
    .replace(/\s+/g, " ")                          // collapse whitespace
    .trim();
  // Drop leaked meta-commentary that weaker models sometimes echo before answering.
  t = t.replace(/^.*?\b(instruction|guidelines?|the user (wants|asked)|as an ai|i (should|must|need to|will))\b[^.!?]*[.!?:)]+\s*/i, "");
  // Drop common filler preambles ("Sure, ", "Okay, ", "Here is my answer: ").
  t = t.replace(/^(sure|okay|ok|alright|certainly|got it|here(?:'s| is)[^:]*)[,:]\s*/i, "");
  return t
    .replace(/^\s*[:\-–—]\s*/, "")                // leading colon or dash
    .replace(/^["'“”]+|["'“”]+$/g, "")            // wrapping quotes
    .trim();
}

/** Split raw model answer into a short "pick" headline and the full rationale */
function splitAnswer(raw: string): { pick: string; rationale: string } {
  const text = clean(raw);
  if (!text) return { pick: "No response", rationale: "This model didn't return an answer in time." };
  // First sentence = pick/prediction, rest = rationale
  const parts = text.match(/^([^.!?]+[.!?])\s*([\s\S]*)$/);
  if (parts) {
    const pick = clean(parts[1]).replace(/^(I (pick|predict|choose|go with|say)|My (pick|answer|prediction) is)\s*/i, "");
    return { pick, rationale: clean(parts[2]) || pick };
  }
  return { pick: text.slice(0, 80), rationale: text };
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

  const models = [1, 2, 3, 4].map(i => ({
    slot:    i,
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
      ({ question, category } = await generateQuestion());
    }

    // Get answers from all 4 models in parallel
    const rawAnswers = await Promise.all(
      models.map(m => getModelAnswer(m.slot, m.persona, question))
    );

    const answers = rawAnswers.map((raw, i) => {
      const { pick, rationale } = splitAnswer(raw);
      return { letter: LETTERS[i], persona: PERSONA_NAMES[i], pick, answer: rationale };
    });

    // Judge picks the winner
    const { winnerLetter } = await judgeAnswers(question, answers);

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
    const optionRows = answers.map((a) => ({
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

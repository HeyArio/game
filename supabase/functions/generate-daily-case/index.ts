/**
 * generate-daily-case
 *
 * Calls 5 different LLM providers to build today's Quorum case:
 *   - 4 "answerer" models (GPT-OSS 20B / Llama 3.3 70B / Mistral Small / Gemini Flash) each answer the question
 *   - 1 "judge" model (Arbi) evaluates all four answers and picks the sharpest
 *
 * Scheduled via Supabase cron — runs once daily at 00:05 UTC.
 *
 * Each persona slot is backed by a provider:
 *   1 GPT-OSS 20B   → OpenRouter  (openai/gpt-oss-20b:free)
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
const PERSONA_NAMES = ["GPT-OSS 20B", "Llama 3.3 70B", "Mistral Small", "Gemini Flash"];
const LETTERS = ["A", "B", "C", "D"];

/** Unbiased Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  1: { provider: "openrouter", model: "openai/gpt-oss-20b:free" },      // GPT-OSS 20B
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

// Per-request ceiling so one slow/hung provider can't stall the whole job.
const REQUEST_TIMEOUT_MS = 30_000;

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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`API error for ${model}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "").trim();
}

// Used when the question-generating model is unavailable, so the daily job
// still produces a playable case instead of failing outright.
const FALLBACK_QUESTIONS: { question: string; category: string }[] = [
  { question: "Which emerging technology will most reshape daily life by 2035?", category: "TECHNOLOGY · PREDICTION" },
  { question: "What single policy would most improve a major city's housing affordability?", category: "ECONOMICS · FORECAST" },
  { question: "Which scientific field is most likely to deliver the next paradigm shift?", category: "SCIENCE · DEBATE" },
  { question: "What is the most underrated skill for the next decade of work?", category: "BUSINESS · STRATEGY" },
  { question: "Which factor matters most for a national team winning a World Cup?", category: "SPORT · FORECAST" },
  { question: "What is the most effective lever for cutting global emissions this decade?", category: "ENVIRONMENT · POLICY" },
];

/** Recent questions the generator must not repeat. Question quality is the
 *  product: with 9 fixed categories and a small model, near-duplicates were
 *  otherwise inevitable within weeks. */
async function fetchRecentQuestions(supabase: ReturnType<typeof createClient>, limit = 60): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("daily_cases")
      .select("question")
      .order("case_no", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r: { question: string }) => r.question).filter(Boolean);
  } catch (e) {
    console.error("fetchRecentQuestions failed (continuing without dedup):", e);
    return [];
  }
}

/** One-shot quality gate: is the candidate genuinely debatable, non-obvious,
 *  and fresh vs. recent questions? If not, the critic supplies a rewrite. On
 *  any failure the original question is kept — the gate can only improve. */
async function critiqueQuestion(question: string, recent: string[]): Promise<string> {
  try {
    const recentBlock = recent.slice(0, 30).map((q) => `- ${q}`).join("\n");
    const content = await callModel(5, [
      {
        role: "system",
        content: "You are a sharp editor for a daily debate game. You judge whether a question is genuinely debatable (reasonable experts disagree), non-obvious, specific enough to have a defensible best answer, and not a repeat. Output ONLY a JSON object.",
      },
      {
        role: "user",
        content: `Candidate question: ${question}\n\nRecently used questions (must not be repeated or closely paraphrased):\n${recentBlock || "(none)"}\n\nIf the candidate is debatable, non-obvious, specific, and fresh, output {"ok": true}. Otherwise output {"ok": false, "rewrite": "<a better single-sentence question on a similar theme, ending with a question mark>"}.`,
      },
    ], 120);
    const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    if (parsed.ok === false && typeof parsed.rewrite === "string") {
      const rewrite = clean(parsed.rewrite).split("\n")[0].trim();
      if (rewrite.length > 15 && rewrite.endsWith("?")) {
        console.log(`critic rewrote question: "${question}" -> "${rewrite}"`);
        return rewrite;
      }
    }
    return question;
  } catch (e) {
    console.error("critiqueQuestion failed (keeping original):", e);
    return question;
  }
}

async function generateQuestion(recent: string[]): Promise<{ question: string; category: string }> {
  const categories = [
    "GEOPOLITICS · FORECAST", "SPORT · FORECAST", "TECHNOLOGY · PREDICTION",
    "ECONOMICS · FORECAST", "SCIENCE · DEBATE", "CULTURE · OPINION",
    "BUSINESS · STRATEGY", "ENVIRONMENT · POLICY", "AI · ETHICS",
  ];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const topic = cat.split(" · ")[0].toLowerCase();

  try {
    const avoidBlock = recent.slice(0, 30).map((q) => `- ${q}`).join("\n");
    const content = await callModel(5, [
      {
        role: "system",
        content: "You generate crisp, debatable daily trivia / prediction questions. Output ONLY the question — no preamble, no punctuation beyond the question mark."
      },
      {
        role: "user",
        content: `Generate a single compelling, open-ended question about ${topic} that reasonable experts could disagree on. It should have a clear "best" answer but not be obvious. Make it timely and interesting. One sentence, ends with a question mark.` +
          (avoidBlock ? `\n\nDo NOT repeat or closely paraphrase any of these recently used questions:\n${avoidBlock}` : "")
      }
    ], 80);

    // Strip leading/trailing quotes or extra text
    let question = content.replace(/^["']|["']$/g, "").split("\n")[0].trim();
    if (!question) throw new Error("Empty question from model");
    // Second-pass quality gate: debatable, non-obvious, fresh — or rewritten.
    question = await critiqueQuestion(question, recent);
    return { question, category: cat };
  } catch (e) {
    console.error("generateQuestion failed, using fallback:", e);
    return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
  }
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

/** Pull a one-sentence justification out of the judge's raw reply even when its
 *  JSON is malformed: try the "reasoning" field loosely, else fall back to the
 *  first substantial prose sentence. */
function extractReasoning(content: string): string {
  const field = content.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  if (field?.[1]) return clean(field[1].replace(/\\(.)/g, "$1"));
  const stripped = content.replace(/```[\s\S]*?```/g, " ").replace(/[{}[\]]/g, " ");
  const sentence = stripped.match(/[A-Za-z][^.!?]{15,}[.!?]/);
  return sentence ? clean(sentence[0]) : "";
}

/** Last resort: ask the judge for a one-sentence "why" for an already-chosen
 *  winner, so Arbi still explains himself when the first reply was unparseable. */
async function reasonFor(
  question: string,
  answers: { letter: string; pick: string; answer: string }[],
  letter: string,
): Promise<string> {
  const a = answers.find((x) => x.letter === letter);
  if (!a) return "";
  try {
    const txt = await callModel(5, [
      { role: "system", content: "You are Arbi, a rigorous AI judge. Reply with exactly ONE sentence — no preamble, no markdown, no JSON." },
      { role: "user", content: `Question: ${question}\n\nThe winning answer:\nPick: ${a.pick}\nReasoning: ${a.answer}\n\nIn one sentence, explain why this is the sharpest, most defensible answer.` },
    ], 80);
    return clean(txt);
  } catch (e) {
    console.error("reasonFor follow-up failed:", e);
    return "";
  }
}

async function judgeAnswers(
  question: string,
  answers: { letter: string; persona: string; pick: string; answer: string }[]
): Promise<JudgeResult> {
  // Anonymise: the judge sees only the letter + the argument, never which model
  // produced it. Otherwise a judge that shares a provider with a contestant
  // (e.g. Gemini judging "Gemini Flash") can show self-preference bias.
  const answerBlock = answers
    .map(a => `Option ${a.letter}:\nPick: ${a.pick}\nReasoning: ${a.answer}`)
    .join("\n\n");

  // Only the letters that actually have a real answer are eligible to win.
  const eligible = answers.map((a) => a.letter);
  const firstEligible = eligible[0] ?? "A";

  // Parse a verdict, tolerating markdown wrappers and stray prose. A greedy
  // brace match keeps reasoning that contains punctuation intact. Returns null
  // when no eligible winner can be extracted.
  const parseVerdict = (content: string): { winner: string; reasoning: string } | null => {
    if (!content) return null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in judge response");
      const parsed = JSON.parse(jsonMatch[0]);
      const winner = (parsed.winner ?? "").toUpperCase();
      if (!eligible.includes(winner)) throw new Error(`Invalid/ineligible winner: ${winner}`);
      return { winner, reasoning: clean(String(parsed.reasoning ?? "")) };
    } catch {
      // Couldn't parse clean JSON — salvage an eligible letter from the prose.
      const scanned = content.match(/\b([A-D])\b/)?.[1] ?? "";
      if (eligible.includes(scanned)) return { winner: scanned, reasoning: "" };
      return null;
    }
  };

  const judgePrompt: ChatMessage[] = [
    {
      role: "system",
      content: "You are Arbi, a rigorous AI judge. You evaluate competing answers by their quality of reasoning, specificity, and defensibility. You are decisive and fair. Output ONLY a JSON object, nothing else."
    },
    {
      role: "user",
      content: `Question: ${question}\n\nThese AI models have each given an answer:\n\n${answerBlock}\n\nEvaluate them. Which answer is the sharpest — the most well-reasoned, specific, and defensible? Output JSON: {"winner": "<letter>", "reasoning": "one sentence explaining why this is the sharpest answer"}`
    }
  ];

  // The verdict IS the product — never accept an arbitrary winner without a
  // retry. Two attempts (the second with a stricter format reminder), and only
  // then degrade to the first eligible letter, loudly.
  let content = "";
  let verdict: { winner: string; reasoning: string } | null = null;
  for (let attempt = 0; attempt < 2 && !verdict; attempt++) {
    try {
      content = await callModel(5, attempt === 0 ? judgePrompt : [
        judgePrompt[0],
        { role: "user", content: judgePrompt[1].content + `\n\nIMPORTANT: reply with EXACTLY one JSON object of the form {"winner": "A|B|C|D", "reasoning": "..."} and nothing else.` },
      ], 150);
    } catch (e) {
      console.error(`judge model attempt ${attempt + 1} failed:`, e);
      content = "";
    }
    verdict = parseVerdict(content);
  }

  let winnerLetter = verdict?.winner ?? firstEligible;
  let reasoning = verdict?.reasoning ?? "";
  if (!verdict) {
    console.error(`JUDGE FALLBACK ENGAGED: no parseable verdict after 2 attempts — defaulting winner to "${firstEligible}". Raw last reply: ${content.slice(0, 300)}`);
  }

  // Arbi must always explain himself. Recover the "why" from the raw reply, then
  // via a one-sentence follow-up call, and only then degrade to a specific line
  // built from the winning pick — never an empty reasoning (which the UI hides).
  if (!reasoning) reasoning = extractReasoning(content);
  if (!reasoning) reasoning = await reasonFor(question, answers, winnerLetter);
  if (!reasoning) {
    const pick = answers.find((a) => a.letter === winnerLetter)?.pick;
    reasoning = pick ? `${pick} was the most specific and defensible call.` : "";
  }
  return { winnerLetter, reasoning };
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

/** Cap text at a word boundary (+ ellipsis) so one verbose model can't turn a
 * card into a wall of text. The answer prompt already asks for 1-2 sentences;
 * this is the backstop for when a model ignores that. */
function cap(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  return (cut > max * 0.6 ? slice.slice(0, cut) : slice).replace(/[\s,;:.–—-]+$/, "") + "…";
}

/** Upper-case the first letter so a rationale left after a dropped "because"
 *  still reads as a sentence ("It delivers…", not "it delivers…"). */
function cap1(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Split a raw model answer into a short, *complete* "pick" headline and the
 * supporting rationale.
 *
 * The pick must read as a finished thought, not a sentence chopped mid-word.
 * Models routinely pack their reasoning into the same sentence as the claim
 * ("Use an LLM API alone because it's faster…"), so taking the whole first
 * sentence and hard-truncating it at 90 chars produced bold headlines that
 * trailed off as "…" with the "why" stranded below. Instead we keep only the
 * claim as the pick and fold any trailing reasoning into the rationale:
 *   • reasoning connectives (because / since / due to / …) are dropped, since the
 *     clause stands on its own as an explanation;
 *   • conditional connectives (when / if / while / unless) are kept, because they
 *     frame the recommendation ("When your task needs only general knowledge…").
 * The length caps remain only as a backstop for a model that ignores the format.
 */
function splitAnswer(raw: string): { pick: string; rationale: string } {
  const text = clean(raw);
  if (!text) return { pick: "No response", rationale: "This model didn't return an answer in time." };

  // First sentence carries the stance; anything after it is extra rationale.
  const m = text.match(/^([^.!?]+[.!?])\s*([\s\S]*)$/);
  const firstSentence = m ? m[1] : text;
  const rest = m ? m[2] : "";

  // Drop conversational lead-ins so the headline opens on the actual claim.
  let pick = clean(firstSentence).replace(
    /^(I(?:'d|'ll| would| will)? (?:pick|predict|choose|go with|say|think|believe|argue|recommend)(?: to)?|My (?:pick|answer|prediction|choice) is)\s*/i,
    "",
  );

  // Peel any trailing reasoning off the claim. Strong connectives are dropped;
  // conditional ones are kept (group 2 includes the connective word). The longer
  // minimum before a conditional split avoids over-trimming a terse stance
  // ("Buy when in doubt"); the dash split requires surrounding spaces so it never
  // breaks a hyphenated word or a numeric range ("lower-maintenance", "2010–2020").
  let reasonTail = "";
  const strong = pick.match(/^(.{4,}?\S)[,\s]+(?:because|since|due to|so that|in order to|owing to)\b[\s,]*([\s\S]*)$/i);
  const cond = pick.match(/^(.{16,}?\S)[,\s]+((?:when|while|if|unless)\b[\s\S]*)$/i);
  const dash = pick.match(/^(.{4,}?\S)(?:\s*—\s*|\s+(?:–|--)\s+)([\s\S]*)$/);
  if (strong) { pick = strong[1]; reasonTail = strong[2]; }
  else if (cond) { pick = cond[1]; reasonTail = cond[2]; }
  else if (dash) { pick = dash[1]; reasonTail = dash[2]; }
  if (!pick) pick = clean(firstSentence) || text;

  const rationale = cap1(clean([reasonTail, rest].filter(Boolean).join(" "))) || pick;
  return { pick: cap(cap1(pick.replace(/[\s,;:.]+$/, "")), 100), rationale: cap(rationale, 280) };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/** Decode a JWT payload (no signature check — the Supabase gateway already
 * verifies the signature when verify_jwt is on). Returns {} on any failure. */
function jwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1] ?? "";
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

/** Only the daily cron (or an operator) may (re)generate a case. The public
 * anon key is itself a valid project JWT, so `verify_jwt` alone is NOT enough —
 * it would let any visitor replace today's case and burn LLM credits. Require
 * the service role, or a shared CRON_SECRET header. */
function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) return true;

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return false;
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;  // documented cron
  return jwtPayload(token).role === "service_role";
}

/** Tell the `send-daily-reminder` function to email signed-up players that a new
 *  case is live. Same-project call, authorized with the service-role key. Returns
 *  the reminder job's JSON summary (or an error shape) for visibility — callers
 *  must guard it so an email hiccup never fails the (already-committed) case. */
async function notifyPlayers(): Promise<unknown> {
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) return { ok: false, error: "missing SUPABASE_URL / service-role key" };
  const res = await fetch(`${base}/functions/v1/send-daily-reminder`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: res.ok, status: res.status, body: text }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Allow both cron invocations (no body) and manual POST with { question, category }
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json", ...CORS },
    });
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
    let skipEmail = false;
    try {
      const body = req.method === "POST" ? await req.json() : {};
      question = body.question || "";
      category = body.category || "";
      // Manual/test generations can opt out of the "new question is live" blast.
      skipEmail = body.skipEmail === true;
    } catch { question = ""; category = ""; }

    if (!question) {
      const recent = await fetchRecentQuestions(supabase);
      ({ question, category } = await generateQuestion(recent));
    }

    // Get answers from all 4 models in parallel. A single model failing (timeout,
    // outage, rate limit) must not kill the whole case — it just shows up as a
    // "No response" card, exactly like the runtime handles a slow model.
    const rawAnswers = await Promise.all(
      models.map(m =>
        getModelAnswer(m.slot, m.persona, question).catch((e) => {
          console.error(`Answer model slot ${m.slot} (${m.persona}) failed:`, e);
          return "";
        })
      )
    );

    // Randomise the model→letter mapping per case so no model sits in the same
    // slot every day (kills positional "tells" — play stays about the argument,
    // not the seat). Cards still read A–D on screen because the today_case view
    // orders options by letter; only the model behind each letter rotates. All
    // downstream logic is keyed by letter, so judge/crowd/vote mapping is intact.
    const assignedLetters = shuffle(LETTERS);
    const answers = rawAnswers
      .map((raw, i) => {
        const { pick, rationale } = splitAnswer(raw);
        return { letter: assignedLetters[i], persona: PERSONA_NAMES[i], pick, answer: rationale };
      })
      .sort((a, b) => a.letter.localeCompare(b.letter));

    // Need at least two real answers for the case to be worth judging.
    const realAnswers = answers.filter((a) => a.pick !== "No response");
    if (realAnswers.length < 2) {
      throw new Error(`Only ${realAnswers.length} model(s) responded — not enough for a case`);
    }

    // Judge picks the winner (judgeAnswers never throws; it falls back internally).
    const { winnerLetter, reasoning: judgeReasoning } = await judgeAnswers(question, realAnswers);

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
      .insert({ case_no: nextCaseNo, question, category, judge_reasoning: clean(judgeReasoning), opens_at: opens.toISOString(), closes_at: closes.toISOString() })
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

    // Keep exactly one case open at a time. The `today_case` view (and the
    // frontend's .single() query) assume a single open case; a manually
    // triggered case mid-day would otherwise overlap the previous 24h window
    // and break that query. Expire any *other* currently-open case now.
    const { error: expireErr } = await supabase
      .from("daily_cases")
      .update({ closes_at: opens.toISOString() })
      .neq("id", caseRow.id)
      .gt("closes_at", opens.toISOString());
    if (expireErr) console.error("Failed to expire previous open cases:", expireErr);

    // A new question is now live — nudge signed-up players to come play it.
    // Opt-in via SEND_DAILY_REMINDER=true (so nothing emails until you turn it
    // on), and skippable per call with { "skipEmail": true } for manual/test
    // runs. The case is already committed, so a mail failure is logged, not fatal.
    let email: unknown = "disabled";
    if (Deno.env.get("SEND_DAILY_REMINDER") === "true" && !skipEmail) {
      email = await notifyPlayers().catch((e) => {
        console.error("send-daily-reminder trigger failed:", e);
        return { ok: false, error: String(e) };
      });
    }

    return new Response(JSON.stringify({ ok: true, caseNo: nextCaseNo, question, winner: winnerLetter, email }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...CORS } });
  }
});

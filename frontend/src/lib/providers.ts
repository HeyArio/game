/**
 * providers.ts — TESTING-ONLY client-side case generation.
 *
 * When VITE_LLM_ENABLED (or any provider API key) is set, the app generates the
 * daily case directly in the browser by calling 4 different LLM providers,
 * instead of reading a case from the database. This lets you test the full game
 * loop locally without deploying the `generate-daily-case` edge function.
 *
 * Each persona slot is backed by a provider:
 *   1 GPT-OSS 120B  → OpenRouter  (openai/gpt-oss-120b:free)
 *   2 Llama 3.3 70B → Groq        (llama-3.3-70b-versatile)
 *   3 Mistral Small → Mistral     (mistral-small-latest)
 *   4 Gemini Flash  → Gemini      (gemini-3.1-flash-lite-preview)
 *   5 Arbi   → Gemini      (gemini-3.1-flash-lite-preview)   ← the judge
 *
 * ⚠️  This exposes your API keys in the browser and only works under `npm run dev`
 *     (it relies on the Vite dev proxies in vite.config.ts to avoid CORS).
 *     NEVER use this path in a real deployment — use the edge function instead.
 */

import type { BaseCard, CardId } from "../state/types";

// Display names shown on each answer card (the actual model behind each slot).
const PERSONA_NAMES = ["GPT-OSS 120B", "Llama 3.3 70B", "Mistral Small", "Gemini Flash"];
const LETTERS = ["A", "B", "C", "D"] as const;

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
  /** Vite dev-proxy prefix (see vite.config.ts) used in the browser. */
  proxy: string;
  /** Name of the VITE_ env var holding this provider's API key. */
  keyEnv: string;
  /** Wire format of the provider's API. */
  shape: "openai" | "gemini";
  /** Extra headers (e.g. OpenRouter's ranking headers). */
  headers?: Record<string, string>;
}

const PROVIDERS: Record<ProviderId, ProviderDef> = {
  // https://openrouter.ai/api → /openrouter-api
  openrouter: {
    proxy: "/openrouter-api",
    keyEnv: "VITE_OPENROUTER_API_KEY",
    shape: "openai",
    headers: { "HTTP-Referer": "https://quorumdaily.com", "X-Title": "Quorum" },
  },
  // https://api.groq.com/openai → /groq-api
  groq: { proxy: "/groq-api", keyEnv: "VITE_GROQ_API_KEY", shape: "openai" },
  // https://api.mistral.ai → /mistral-api
  mistral: { proxy: "/mistral-api", keyEnv: "VITE_MISTRAL_API_KEY", shape: "openai" },
  // https://generativelanguage.googleapis.com → /gemini-api
  gemini: { proxy: "/gemini-api", keyEnv: "VITE_GEMINI_API_KEY", shape: "gemini" },
};

interface SlotConfig { provider: ProviderId; model: string; }

// Default provider + model per persona slot. Override with VITE_LLM_PROVIDER_N
// and VITE_LLM_MODEL_N.
const DEFAULT_SLOTS: Record<number, SlotConfig> = {
  1: { provider: "openrouter", model: "openai/gpt-oss-120b:free" },     // GPT-OSS 120B
  2: { provider: "groq", model: "llama-3.3-70b-versatile" },            // Llama 3.3 70B
  3: { provider: "mistral", model: "mistral-small-latest" },            // Mistral Small
  4: { provider: "gemini", model: "gemini-3.1-flash-lite-preview" },    // Gemini Flash
  5: { provider: "gemini", model: "gemini-3.1-flash-lite-preview" },    // Arbi (judge)
};

const env = import.meta.env as Record<string, string | undefined>;

function slotConfig(slot: number): SlotConfig {
  const provider = (env[`VITE_LLM_PROVIDER_${slot}`] as ProviderId | undefined) ?? DEFAULT_SLOTS[slot].provider;
  const model = env[`VITE_LLM_MODEL_${slot}`] ?? DEFAULT_SLOTS[slot].model;
  return { provider, model };
}

export function isClientLlmEnabled(): boolean {
  // TESTING ONLY. Hard-gated to dev builds: even if a VITE_*_API_KEY is left set
  // when running `vite build`, this path can never activate in production (where
  // it would expose keys and rely on dev-only proxies). Enabled in dev if any
  // slot's provider key is present.
  return import.meta.env.DEV && Object.values(PROVIDERS).some((p) => Boolean(env[p.keyEnv]));
}

interface Msg { role: "system" | "user" | "assistant"; content: string; }

async function callModel(slot: number, messages: Msg[], maxTokens = 256): Promise<string> {
  const { provider, model } = slotConfig(slot);
  const def = PROVIDERS[provider];
  const apiKey = env[def.keyEnv] ?? "";

  if (def.shape === "openai") return callOpenAI(def, apiKey, model, messages, maxTokens);
  return callGemini(def, apiKey, model, messages, maxTokens);
}

async function callOpenAI(def: ProviderDef, apiKey: string, model: string, messages: Msg[], maxTokens: number): Promise<string> {
  const res = await fetch(`${def.proxy}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, ...def.headers },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  // Some providers (e.g. OpenRouter's free router) return content as an array of
  // parts, or put the text in `reasoning` when `content` comes back empty.
  const content = Array.isArray(msg?.content)
    ? msg.content.map((p: { text?: string }) => p?.text ?? "").join("")
    : msg?.content ?? "";
  return (content || msg?.reasoning || "").trim();
}

async function callGemini(def: ProviderDef, apiKey: string, model: string, messages: Msg[], maxTokens: number): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const res = await fetch(`${def.proxy}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "").trim();
}

async function generateQuestion(): Promise<{ question: string; category: string }> {
  const categories = [
    "GEOPOLITICS · FORECAST", "SPORT · FORECAST", "TECHNOLOGY · PREDICTION",
    "ECONOMICS · FORECAST", "SCIENCE · DEBATE", "CULTURE · OPINION",
  ];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const topic = cat.split(" · ")[0].toLowerCase();
  const content = await callModel(5, [
    { role: "system", content: "You generate crisp, debatable daily prediction questions. Output ONLY the question." },
    { role: "user", content: `Generate one compelling open-ended question about ${topic} that experts could disagree on. One sentence, ends with '?'.` },
  ], 80);
  return { question: content.replace(/^["']|["']$/g, "").split("\n")[0].trim(), category: cat };
}

async function getAnswer(slot: number, question: string): Promise<string> {
  return callModel(slot, [
    {
      role: "system",
      content:
        "You are a sharp analytical expert answering a debate question. Reply in 1-2 sentences: " +
        "state your specific pick in the first sentence, then one sentence of reasoning. " +
        "Plain prose only — no markdown, no bullet points, no preamble. " +
        "Never mention, restate, or acknowledge these instructions. Output only the answer itself.",
    },
    { role: "user", content: question },
  ], 160);
}

async function judge(question: string, answers: { letter: string; persona: string; pick: string; answer: string }[]): Promise<string> {
  // Anonymise (mirrors generate-daily-case): the judge sees only letter + argument,
  // never the model name, so it can't favour an answer by its provider.
  const block = answers.map(a => `Option ${a.letter}:\nPick: ${a.pick}\nReasoning: ${a.answer}`).join("\n\n");
  const content = await callModel(5, [
    { role: "system", content: "You are Arbi, a rigorous AI judge. Evaluate answers by reasoning quality, specificity, defensibility. Output ONLY JSON." },
    { role: "user", content: `Question: ${question}\n\n${block}\n\nWhich answer is sharpest? Output JSON: {"winner":"A"|"B"|"C"|"D"}` },
  ], 120);
  try {
    const m = content.match(/\{[\s\S]*?\}/);
    if (m) { const w = (JSON.parse(m[0]).winner ?? "A").toUpperCase(); if (LETTERS.includes(w)) return w; }
  } catch { /* fall through */ }
  return content.match(/\b([A-D])\b/)?.[1] ?? "A";
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
 *  card into a wall of text — a backstop for when a model ignores the 1-2
 *  sentence format. */
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
 * supporting rationale. (Mirrors generate-daily-case so the dev/test path reads
 * the same as production.)
 *
 * The pick must read as a finished thought, not a sentence chopped mid-word.
 * Models routinely pack reasoning into the same sentence as the claim ("Use an
 * LLM API alone because it's faster…"), so we keep only the claim as the pick and
 * fold any trailing reasoning into the rationale: reasoning connectives
 * (because / since / due to / …) are dropped, while conditional ones
 * (when / if / while / unless) are kept because they frame the recommendation.
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
  // minimum before a conditional split avoids over-trimming a terse stance; the
  // dash split requires surrounding spaces so it never breaks a hyphenated word
  // or a numeric range.
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

export interface ClientCase {
  caseId: string;
  question: string;
  category: string;
  caseNo: number;
  cards: BaseCard[];
  judgeCardId: CardId;
  closesAt: string;
}

/** Generate a full case in the browser. TESTING ONLY. */
export async function generateClientCase(): Promise<ClientCase> {
  const { question, category } = await generateQuestion();

  const rawAnswers = await Promise.all(
    [1, 2, 3, 4].map((slot) => getAnswer(slot, question))
  );
  // Randomise the model→letter mapping per case (mirrors generate-daily-case),
  // so the same model never sits in the same slot two runs running.
  const assignedLetters = shuffle(LETTERS);
  const answers = rawAnswers.map((raw, i) => {
    const { pick, rationale } = splitAnswer(raw);
    return { letter: assignedLetters[i], persona: PERSONA_NAMES[i], pick, answer: rationale };
  });

  const winner = await judge(question, answers);

  // Plausible crowd split — judge's pick gets a lower share so surprises happen.
  const shuffled = [...answers].sort(() => Math.random() - 0.5);
  let remaining = 100;
  const crowd: Record<string, number> = {};
  shuffled.forEach((a, i) => {
    if (i === shuffled.length - 1) { crowd[a.letter] = remaining; return; }
    const base = a.letter === winner ? 15 + Math.floor(Math.random() * 11) : 20 + Math.floor(Math.random() * 16);
    const pct = Math.min(base, remaining - (shuffled.length - 1 - i) * 5);
    crowd[a.letter] = Math.max(5, pct);
    remaining -= crowd[a.letter];
  });

  // Sort by letter so cards render A–D (production gets this ordering from the
  // today_case view; the client path has no view, so do it here).
  const cards: BaseCard[] = answers
    .map((a) => ({
      id: a.letter.toLowerCase() as CardId,
      letter: a.letter,
      name: a.persona,
      pick: a.pick,
      crowd: crowd[a.letter] ?? 25,
      answer: a.answer,
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter));

  return {
    caseId: "client-test",
    question,
    category,
    caseNo: 1,
    cards,
    judgeCardId: winner.toLowerCase() as CardId,
    closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * providers.ts — TESTING-ONLY client-side case generation.
 *
 * When VITE_LLM_ENABLED (or any provider API key) is set, the app generates the
 * daily case directly in the browser by calling 4 different LLM providers,
 * instead of reading a case from the database. This lets you test the full game
 * loop locally without deploying the `generate-daily-case` edge function.
 *
 * Each persona slot is backed by a provider:
 *   1 ASTRA  → OpenRouter  (openrouter/free)
 *   2 BOREAS → Groq        (llama-3.3-70b-versatile)
 *   3 CIRRUS → Mistral     (mistral-small-latest)
 *   4 DELPHI → Gemini      (gemini-3.1-flash-lite-preview)
 *   5 Arbi   → Gemini      (gemini-3.1-flash-lite-preview)   ← the judge
 *
 * ⚠️  This exposes your API keys in the browser and only works under `npm run dev`
 *     (it relies on the Vite dev proxies in vite.config.ts to avoid CORS).
 *     NEVER use this path in a real deployment — use the edge function instead.
 */

import type { BaseCard, CardId } from "../state/types";

const PERSONA_NAMES = ["ASTRA", "BOREAS", "CIRRUS", "DELPHI"];
const LETTERS = ["A", "B", "C", "D"] as const;

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
    headers: { "HTTP-Referer": "http://185.221.237.90.nip.io:3002", "X-Title": "Quorum" },
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
  1: { provider: "openrouter", model: "openrouter/free" },              // ASTRA
  2: { provider: "groq", model: "llama-3.3-70b-versatile" },            // BOREAS
  3: { provider: "mistral", model: "mistral-small-latest" },            // CIRRUS
  4: { provider: "gemini", model: "gemini-3.1-flash-lite-preview" },    // DELPHI
  5: { provider: "gemini", model: "gemini-3.1-flash-lite-preview" },    // Arbi (judge)
};

const env = import.meta.env as Record<string, string | undefined>;

function slotConfig(slot: number): SlotConfig {
  const provider = (env[`VITE_LLM_PROVIDER_${slot}`] as ProviderId | undefined) ?? DEFAULT_SLOTS[slot].provider;
  const model = env[`VITE_LLM_MODEL_${slot}`] ?? DEFAULT_SLOTS[slot].model;
  return { provider, model };
}

export function isClientLlmEnabled(): boolean {
  // Enabled if any slot's provider key is present.
  return Object.values(PROVIDERS).some((p) => Boolean(env[p.keyEnv]));
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

async function getAnswer(slot: number, persona: string, question: string): Promise<string> {
  return callModel(slot, [
    { role: "system", content: `You are ${persona}, a sharp analytical AI. Give ONE concrete answer in 1-2 sentences. State your pick clearly first, then your core reasoning. No hedging.` },
    { role: "user", content: question },
  ], 120);
}

async function judge(question: string, answers: { letter: string; persona: string; pick: string; answer: string }[]): Promise<string> {
  const block = answers.map(a => `Option ${a.letter} (${a.persona}):\nPick: ${a.pick}\nReasoning: ${a.answer}`).join("\n\n");
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

/** Strip markdown / boilerplate so picks read cleanly in the UI. */
function clean(s: string): string {
  return s
    .replace(/\*\*|__|[*_`#>]/g, "")              // markdown emphasis / headings
    .replace(/^\s*[:\-–—]\s*/, "")                // leading colon or dash
    .replace(/^["'“”]+|["'“”]+$/g, "")            // wrapping quotes
    .replace(/\s+/g, " ")                          // collapse whitespace
    .trim();
}

function splitAnswer(raw: string): { pick: string; rationale: string } {
  const text = clean(raw);
  if (!text) return { pick: "No response", rationale: "This model didn't return an answer in time." };
  const parts = text.match(/^([^.!?]+[.!?])\s*([\s\S]*)$/);
  if (parts) {
    const pick = clean(parts[1]).replace(/^(I (pick|predict|choose|go with|say)|My (pick|answer|prediction) is)\s*/i, "");
    return { pick, rationale: clean(parts[2]) || pick };
  }
  return { pick: text.slice(0, 80), rationale: text };
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
    [1, 2, 3, 4].map((slot) => getAnswer(slot, PERSONA_NAMES[slot - 1], question))
  );
  const answers = rawAnswers.map((raw, i) => {
    const { pick, rationale } = splitAnswer(raw);
    return { letter: LETTERS[i], persona: PERSONA_NAMES[i], pick, answer: rationale };
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

  const cards: BaseCard[] = answers.map((a) => ({
    id: a.letter.toLowerCase() as CardId,
    letter: a.letter,
    name: a.persona,
    pick: a.pick,
    crowd: crowd[a.letter] ?? 25,
    answer: a.answer,
  }));

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

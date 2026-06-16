/**
 * nvidia.ts — TESTING-ONLY client-side case generation.
 *
 * When VITE_NVIDIA_API_KEY is set, the app generates the daily case directly in
 * the browser by calling the 5 NVIDIA models, instead of reading a case from the
 * database. This lets you test the full game loop locally without deploying the
 * `generate-daily-case` edge function.
 *
 * ⚠️  This exposes your API key in the browser and only works under `npm run dev`
 *     (it relies on the Vite dev proxy in vite.config.ts to avoid CORS).
 *     NEVER use this path in a real deployment — use the edge function instead.
 */

import type { BaseCard, CardId } from "../state/types";

const PROXY_BASE = "/nvidia-api/v1"; // proxied to https://integrate.api.nvidia.com by Vite
const PERSONA_NAMES = ["ASTRA", "BOREAS", "CIRRUS", "DELPHI"];
const LETTERS = ["A", "B", "C", "D"] as const;

// Default model assignment (judge = Nemotron, the most capable / best evaluator).
// Override any slot in frontend/.env with VITE_NVIDIA_MODEL_1..5.
const DEFAULT_MODELS: Record<number, string> = {
  1: "minimaxai/minimax-m3",                 // ASTRA
  2: "mistralai/mistral-medium-3.5-128b",    // BOREAS
  3: "deepseek-ai/deepseek-v4-pro",          // CIRRUS
  4: "google/gemma-4-31b-it",                // DELPHI
  5: "nvidia/nemotron-3-ultra-550b-a55b",    // Arbi (judge)
};

const env = import.meta.env as Record<string, string | undefined>;

export function isClientNvidiaEnabled(): boolean {
  return Boolean(env.VITE_NVIDIA_API_KEY);
}

function keyFor(slot: number): string {
  return env[`VITE_NVIDIA_API_KEY_${slot}`] ?? env.VITE_NVIDIA_API_KEY ?? "";
}
function modelFor(slot: number): string {
  return env[`VITE_NVIDIA_MODEL_${slot}`] ?? DEFAULT_MODELS[slot];
}

interface Msg { role: "system" | "user" | "assistant"; content: string; }

async function callModel(apiKey: string, model: string, messages: Msg[], maxTokens = 256): Promise<string> {
  const res = await fetch(`${PROXY_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`NVIDIA ${model}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateQuestion(): Promise<{ question: string; category: string }> {
  const categories = [
    "GEOPOLITICS · FORECAST", "SPORT · FORECAST", "TECHNOLOGY · PREDICTION",
    "ECONOMICS · FORECAST", "SCIENCE · DEBATE", "CULTURE · OPINION",
  ];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const topic = cat.split(" · ")[0].toLowerCase();
  const content = await callModel(keyFor(5), modelFor(5), [
    { role: "system", content: "You generate crisp, debatable daily prediction questions. Output ONLY the question." },
    { role: "user", content: `Generate one compelling open-ended question about ${topic} that experts could disagree on. One sentence, ends with '?'.` },
  ], 80);
  return { question: content.replace(/^["']|["']$/g, "").split("\n")[0].trim(), category: cat };
}

async function getAnswer(slot: number, persona: string, question: string): Promise<string> {
  return callModel(keyFor(slot), modelFor(slot), [
    { role: "system", content: `You are ${persona}, a sharp analytical AI. Give ONE concrete answer in 1-2 sentences. State your pick clearly first, then your core reasoning. No hedging.` },
    { role: "user", content: question },
  ], 120);
}

async function judge(question: string, answers: { letter: string; persona: string; pick: string; answer: string }[]): Promise<string> {
  const block = answers.map(a => `Option ${a.letter} (${a.persona}):\nPick: ${a.pick}\nReasoning: ${a.answer}`).join("\n\n");
  const content = await callModel(keyFor(5), modelFor(5), [
    { role: "system", content: "You are Arbi, a rigorous AI judge. Evaluate answers by reasoning quality, specificity, defensibility. Output ONLY JSON." },
    { role: "user", content: `Question: ${question}\n\n${block}\n\nWhich answer is sharpest? Output JSON: {"winner":"A"|"B"|"C"|"D"}` },
  ], 120);
  try {
    const m = content.match(/\{[\s\S]*?\}/);
    if (m) { const w = (JSON.parse(m[0]).winner ?? "A").toUpperCase(); if (LETTERS.includes(w)) return w; }
  } catch { /* fall through */ }
  return content.match(/\b([A-D])\b/)?.[1] ?? "A";
}

function splitAnswer(raw: string): { pick: string; rationale: string } {
  const parts = raw.match(/^([^.!?]+[.!?])\s*([\s\S]*)$/);
  if (parts) return {
    pick: parts[1].trim().replace(/^(I (pick|predict|choose|go with|say)|My (pick|answer|prediction) is)\s*/i, ""),
    rationale: parts[2].trim() || parts[1].trim(),
  };
  return { pick: raw.slice(0, 60).trim(), rationale: raw };
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

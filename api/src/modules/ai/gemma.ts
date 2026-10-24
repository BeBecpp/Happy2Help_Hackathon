import { GoogleGenAI } from "@google/genai";
import { aiConfig } from "../../config.ts";
import { SYSTEM_INSTRUCTION_MN } from "./prompt.ts";

/**
 * Happy AI client for Gemma 4 (open-weight model by Google DeepMind).
 *
 * Two supported hosted inference endpoints, selected by HAPPY_AI_PROVIDER / available key:
 *   gemini      — Google Gemini API `generateContent`. Model ids verified 2026-10-24 at
 *                 ai.google.dev/gemma/docs/core/gemma_on_gemini_api: `gemma-4-26b-a4b-it`, `gemma-4-31b-it`.
 *   openrouter  — OpenRouter (OpenAI-compatible `chat/completions`) serving Gemma 4 weights;
 *                 model id as listed by GET https://openrouter.ai/api/v1/models (e.g. `google/gemma-4-26b-a4b-it`).
 * Both paths send the same system instruction + user prompt and return raw text that is
 * then validated with Zod (schema.ts). Neither path ever receives non-fictional data here.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GemmaClient {
  provider: "google-gemini-api" | "openrouter";
  generate(userPrompt: string, signal: AbortSignal): Promise<{ text: string; modelId: string }>;
  /** Free-form chat (student assistant). The caller supplies the system message. */
  chat(messages: ChatMessage[], signal: AbortSignal, opts?: { maxTokens?: number }): Promise<{ text: string; modelId: string }>;
  listGemmaModels(): Promise<string[]>;
}

export class AiDisabledError extends Error {
  constructor() {
    super("AI_NOT_CONFIGURED");
  }
}

let callsThisProcess = 0;

function budget() {
  if (callsThisProcess >= aiConfig.maxCallsPerProcess) throw new Error("CALL_BUDGET_EXHAUSTED");
  callsThisProcess += 1;
}

function geminiClient(apiKey: string, modelId: string): GemmaClient {
  const ai = new GoogleGenAI({ apiKey });
  return {
    provider: "google-gemini-api",
    async generate(userPrompt, signal) {
      budget();
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: { systemInstruction: SYSTEM_INSTRUCTION_MN, temperature: 0.2, maxOutputTokens: 800, abortSignal: signal },
      });
      const text = response.text ?? "";
      if (!text) throw new Error("EMPTY_REPLY");
      return { text, modelId };
    },
    async chat(messages, signal, opts = {}) {
      budget();
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const response = await ai.models.generateContent({
        model: modelId,
        contents: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        config: { systemInstruction: system || undefined, temperature: 0.2, maxOutputTokens: opts.maxTokens ?? 600, abortSignal: signal },
      });
      const text = response.text ?? "";
      if (!text) throw new Error("EMPTY_REPLY");
      return { text, modelId };
    },
    async listGemmaModels() {
      const names: string[] = [];
      const pager = await ai.models.list({ config: { pageSize: 100 } });
      for await (const model of pager) {
        const name = model.name ?? "";
        if (name.toLowerCase().includes("gemma")) names.push(name.replace(/^models\//, ""));
      }
      return names.sort();
    },
  };
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason ?? new Error("TIMEOUT"));
    }, { once: true });
  });

function openRouterClient(apiKey: string, modelId: string): GemmaClient {
  const base = aiConfig.openRouterBaseUrl;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
    "HTTP-Referer": "https://github.com/BeBecpp/Happy2Help_Hackathon",
    "X-Title": "Happy2Help (Hack Day demo)",
  };
  const client: GemmaClient = {
    provider: "openrouter",
    generate(userPrompt, signal) {
      return client.chat([{ role: "system", content: SYSTEM_INSTRUCTION_MN }, { role: "user", content: userPrompt }], signal, { maxTokens: 800 });
    },
    async chat(messages, signal, opts = {}) {
      // Configured Gemma 4 slug first, then the Gemma 4 fallback chain. Capacity errors (402 credits,
      // 429 rate limit, 503) move on; 429/503 first get one short backoff retry on the same slug.
      const candidates = [modelId, ...aiConfig.fallbackModels.filter((m) => m !== modelId)];
      let lastError: Error | null = null;
      for (const model of candidates) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            return await completeWith(model, messages, signal, opts.maxTokens ?? 600);
          } catch (error) {
            lastError = error as Error;
            const status = /^(\d{3}) /.exec(lastError.message)?.[1];
            if (status !== "402" && status !== "429" && status !== "503") throw error;
            if (status === "402" || attempt === 1) break;
            const retryAfter = Number((error as { retryAfterSec?: number }).retryAfterSec) || 0;
            await sleep(Math.min(Math.max(retryAfter * 1000, 1500), 5000), signal);
          }
        }
      }
      throw lastError ?? new Error("PROVIDER_ERROR");
    },
    async listGemmaModels() {
      const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`${res.status} models list failed`);
      const json = (await res.json()) as { data?: Array<{ id: string }> };
      return (json.data ?? []).map((m) => m.id).filter((id) => /gemma/i.test(id)).sort();
    },
  };
  return client;

  async function completeWith(model: string, messages: ChatMessage[], signal: AbortSignal, maxTokens: number) {
    budget();
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({ model, temperature: 0.2, max_tokens: maxTokens, messages }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      const error = new Error(`${res.status} ${detail}`) as Error & { retryAfterSec?: number };
      error.retryAfterSec = Number(res.headers.get("retry-after")) || undefined;
      throw error;
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>; model?: string };
    const content = json.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => c.text ?? "").join("") : "";
    if (!text) throw new Error("EMPTY_REPLY");
    return { text, modelId: json.model ?? model };
  }
}

/** Picks the provider from HAPPY_AI_PROVIDER, else whichever key is present (Gemini first). */
export function createGemmaClient(): GemmaClient {
  const provider = aiConfig.provider;
  if (provider === "google-gemini-api") return geminiClient(aiConfig.geminiKey!, aiConfig.modelId);
  if (provider === "openrouter") return openRouterClient(aiConfig.openRouterKey!, aiConfig.modelId);
  throw new AiDisabledError();
}

/** Maps provider/transport failures to a short, non-sensitive reason code for storage. */
export function classifyAiFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/abort|timeout|timed out/i.test(message)) return "TIMEOUT";
  if (/429|quota|rate|RESOURCE_EXHAUSTED|insufficient/i.test(message)) return "QUOTA";
  if (/401|403|API key|PERMISSION_DENIED|UNAUTHENTICATED|No auth/i.test(message)) return "AUTH";
  if (/404|not found|NOT_FOUND|No endpoints/i.test(message)) return "MODEL_NOT_FOUND";
  if (/NO_JSON_OBJECT|Unexpected token|JSON|REPLY_TOO_LONG|EMPTY_REPLY/i.test(message)) return "INVALID_OUTPUT";
  if (/ZodError|invalid_enum|invalid_type|too_big|too_small|unrecognized_keys/i.test(message) || (error as { issues?: unknown })?.issues) {
    return "SCHEMA_VIOLATION";
  }
  if (/CALL_BUDGET_EXHAUSTED/.test(message)) return "BUDGET";
  if (/AI_NOT_CONFIGURED/.test(message)) return "AI_NOT_CONFIGURED";
  if (/ENOTFOUND|ECONNREFUSED|fetch failed|network/i.test(message)) return "NETWORK";
  return "PROVIDER_ERROR";
}

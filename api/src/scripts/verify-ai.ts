/**
 * Live verification of Happy AI = Gemma 4 on the Gemini API.
 *
 *   GEMINI_API_KEY=... pnpm --filter happy2help_api ai:verify
 *
 * 1. Lists the Gemma models this key can actually reach (proves the model id exists today).
 * 2. Sends ONE fictional Mongolian incident and validates the structured reply.
 * 3. Writes a redacted proof file to docs/ai-proof/latest.json (model id, timestamp, latency,
 *    input, validated output). The API key is never written.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { aiConfig } from "../config.ts";
import { createGemmaClient } from "../modules/ai/gemma.ts";
import { buildUserPrompt } from "../modules/ai/prompt.ts";
import { parseAiOutput, PROMPT_VERSION } from "../modules/ai/schema.ts";

const FICTIONAL_CASE = {
  category: "BULLYING" as const,
  zoneNameMn: "Коридор",
  description:
    "Долоо хоногийн турш ахлах ангийн хоёр хүү намайг коридорт тулгаж, нэрээр доромжилж, цүнхээ минь булаадаг. Өнөөдөр бас мөнгө нэхсэн. Би айж байна.",
};

async function main() {
  if (!aiConfig.enabled) {
    console.error("No GEMINI_API_KEY or OPENROUTER_API_KEY is set. Nothing was called. Happy AI stays disabled; the SOS flow is unaffected.");
    process.exit(2);
  }
  const client = createGemmaClient();
  console.log(`Provider: ${aiConfig.provider} · model: ${aiConfig.modelId}`);

  // The model list is evidence, not a precondition: a flaky network must not stop the generation retries.
  const models = await client.listGemmaModels().catch((error: unknown) => {
    console.warn(`model list unavailable: ${error instanceof Error ? error.message : error}`);
    return [] as string[];
  });
  console.log(`Gemma models visible to this key (${models.length}):\n  ${models.join("\n  ") || "(none)"}`);
  const configuredAvailable = models.includes(aiConfig.modelId);
  if (!configuredAvailable) {
    console.warn(`WARNING: configured model ${aiConfig.modelId} is not in the list above.`);
  }

  const prompt = buildUserPrompt(FICTIONAL_CASE);
  // --retry N: repeat capacity failures (402/429/503) every 45 s, up to N attempts, for free-tier windows.
  const retryIdx = process.argv.indexOf("--retry");
  const attempts = retryIdx > 0 ? Math.max(1, Number(process.argv[retryIdx + 1]) || 1) : 1;
  let reply: { text: string; modelId: string } | null = null;
  let latencyMs = 0;
  for (let attempt = 1; attempt <= attempts && !reply; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("TIMEOUT")), aiConfig.timeoutMs);
    const started = Date.now();
    try {
      reply = await client.generate(prompt, controller.signal);
      latencyMs = Date.now() - started;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === attempts || !/^(402|429|503) |fetch failed|TIMEOUT|abort/i.test(message)) throw error;
      console.log(`${new Date().toISOString()} attempt ${attempt}/${attempts}: ${message.slice(0, 120)} — retrying in 45 s`);
      await new Promise((r) => setTimeout(r, 45_000));
    } finally {
      clearTimeout(timer);
    }
  }
  const { text, modelId } = reply!;
  const output = parseAiOutput(text);

  const proof = {
    verifiedAt: new Date().toISOString(),
    provider: aiConfig.provider,
    endpoint: aiConfig.provider === "openrouter" ? "https://openrouter.ai/api/v1/chat/completions (OpenAI-compatible)" : "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent (via @google/genai)",
    modelId,
    modelListedByApi: configuredAvailable,
    gemmaModelsVisible: models,
    promptVersion: PROMPT_VERSION,
    latencyMs,
    input: { ...FICTIONAL_CASE, note: "fictional demo text, no real person" },
    validatedOutput: output,
  };
  const dir = join(__dirname, "../../../docs/ai-proof");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "latest.json"), JSON.stringify(proof, null, 2) + "\n");
  console.log(`\nLive Gemma 4 response validated in ${latencyMs} ms:\n${JSON.stringify(output, null, 2)}`);
  console.log(`\nProof written to docs/ai-proof/latest.json (no secrets).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification FAILED:", error instanceof Error ? error.message : error);
    process.exit(1);
  });

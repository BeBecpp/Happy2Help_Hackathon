/**
 * Prints HTTP status + provider error text per Gemma 4 slug on OpenRouter (one tiny request each).
 * Never prints the API key. Usage: pnpm --filter happy2help_api ai:diag
 */
import { aiConfig } from "../config.ts";

async function main() {
  if (!aiConfig.openRouterKey) {
    console.error("OPENROUTER_API_KEY is not set.");
    process.exit(2);
  }
  const keyInfo = await fetch(`${aiConfig.openRouterBaseUrl}/key`, { headers: { Authorization: `Bearer ${aiConfig.openRouterKey}` } });
  const keyJson = (await keyInfo.json().catch(() => ({}))) as { data?: { usage?: number; limit?: number | null; is_free_tier?: boolean; rate_limit?: unknown } };
  console.log(`key status ${keyInfo.status} · free tier: ${keyJson.data?.is_free_tier} · usage: ${keyJson.data?.usage} · limit: ${keyJson.data?.limit}`);
  const slugs = [...new Set([aiConfig.modelId, ...aiConfig.fallbackModels])];
  for (const model of slugs) {
    const res = await fetch(`${aiConfig.openRouterBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${aiConfig.openRouterKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 20, messages: [{ role: "user", content: "Сайн уу гэж хариул." }] }),
    });
    const body = (await res.text()).slice(0, 260).replace(/\s+/g, " ");
    console.log(`${model} → ${res.status} · retry-after=${res.headers.get("retry-after") ?? "-"} · ${body}`);
  }
}

main().catch((error) => {
  console.error("diag failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

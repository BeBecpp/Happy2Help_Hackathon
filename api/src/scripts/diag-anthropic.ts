/**
 * Lists the Claude models this ANTHROPIC_API_KEY can use (Haiku first) and makes one tiny call with
 * ANTHROPIC_MODEL. Never prints the key. Usage: pnpm --filter happy2help_api ai:diag-anthropic
 */
import { aiConfig } from "../config.ts";

async function main() {
  const key = aiConfig.anthropicKey;
  if (!key) {
    console.error("ANTHROPIC_API_KEY is not set in .env.");
    process.exit(2);
  }
  const headers = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  const list = await fetch(`${aiConfig.anthropicBaseUrl}/models?limit=100`, { headers });
  const json = (await list.json().catch(() => ({}))) as { data?: Array<{ id: string; display_name?: string }>; error?: { message?: string } };
  if (!list.ok) {
    console.log(`models → ${list.status} ${json.error?.message ?? ""}`);
    process.exit(1);
  }
  const ids = (json.data ?? []).map((m) => `${m.id}${m.display_name ? ` (${m.display_name})` : ""}`);
  const haiku = ids.filter((id) => /haiku/i.test(id));
  console.log(`models visible: ${ids.length} · haiku: ${haiku.join(", ") || "(none)"}`);
  const model = process.env.ANTHROPIC_MODEL || haiku[0]?.split(" ")[0] || "claude-haiku-4-5";
  const res = await fetch(`${aiConfig.anthropicBaseUrl}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, max_tokens: 40, messages: [{ role: "user", content: "Монголоор нэг өгүүлбэрээр мэндлээрэй." }] }),
  });
  const body = (await res.json().catch(() => ({}))) as { content?: Array<{ text?: string }>; model?: string; error?: { message?: string } };
  console.log(res.ok ? `call ${model} → 200 · model=${body.model} · "${(body.content?.[0]?.text ?? "").slice(0, 120)}"` : `call ${model} → ${res.status} ${body.error?.message ?? ""}`);
  console.log(`configured: provider=${aiConfig.provider} model=${aiConfig.modelId}`);
}

main().catch((error) => {
  console.error("diag failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

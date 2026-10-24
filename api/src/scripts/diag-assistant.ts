/** One student-assistant style call through the real adapter; prints the raw error message (no secrets). */
import { createGemmaClient } from "../modules/ai/gemma.ts";

const controller = new AbortController();
setTimeout(() => controller.abort(new Error("TIMEOUT")), 25_000);
createGemmaClient()
  .chat([{ role: "system", content: "Монголоор нэг өгүүлбэрээр хариул." }, { role: "user", content: "Сайн уу?" }], controller.signal, { maxTokens: 60 })
  .then((r) => console.log("OK", r.modelId, r.text.slice(0, 200)))
  .catch((e) => console.log("ERR", e instanceof Error ? `${e.name}: ${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}` : e))
  .finally(() => process.exit(0));

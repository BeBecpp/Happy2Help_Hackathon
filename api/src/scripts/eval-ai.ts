/**
 * Runs the fictional Mongolian evaluation set (api/eval/incidents.mn.json) through
 * Gemma 4 and reports schema validity and category agreement.
 *
 *   GEMINI_API_KEY=... pnpm --filter happy2help_api ai:eval
 *
 * Writes docs/ai-proof/eval-latest.json (redacted: no key). Each case is one API call.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { aiConfig } from "../config.ts";
import { createGemmaClient } from "../modules/ai/gemma.ts";
import { buildUserPrompt } from "../modules/ai/prompt.ts";
import { parseAiOutput, PROMPT_VERSION, type AiAnalysisOutput } from "../modules/ai/schema.ts";
import type { IncidentCategory } from "../modules/incidents/constants.ts";

interface EvalCase {
  id: string;
  category: IncidentCategory;
  zoneNameMn: string;
  description: string;
  expected: string;
  acceptable: string[];
}

async function main() {
  if (!aiConfig.enabled) {
    console.error("No GEMINI_API_KEY or OPENROUTER_API_KEY is set. Nothing was called. Happy AI stays disabled; the SOS flow is unaffected.");
    process.exit(2);
  }
  const dataset = JSON.parse(readFileSync(join(__dirname, "../../eval/incidents.mn.json"), "utf8")) as { cases: EvalCase[] };
  const client = createGemmaClient();
  const results: Array<{ id: string; expected: string; got?: string; acceptable: boolean; valid: boolean; latencyMs: number; error?: string; output?: AiAnalysisOutput }> = [];

  for (const c of dataset.cases) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("TIMEOUT")), aiConfig.timeoutMs);
    const started = Date.now();
    try {
      const { text } = await client.generate(buildUserPrompt(c), controller.signal);
      const output = parseAiOutput(text);
      const acceptable = c.acceptable.includes(output.categorySuggestion);
      results.push({ id: c.id, expected: c.expected, got: output.categorySuggestion, acceptable, valid: true, latencyMs: Date.now() - started, output });
      console.log(`${acceptable ? "OK  " : "MISS"} ${c.id} expected=${c.expected} got=${output.categorySuggestion} urgency=${output.urgency} conf=${output.confidence} (${Date.now() - started} ms)`);
    } catch (error) {
      results.push({ id: c.id, expected: c.expected, acceptable: false, valid: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message.slice(0, 200) : String(error) });
      console.log(`FAIL ${c.id} ${error instanceof Error ? error.message.slice(0, 120) : error}`);
    } finally {
      clearTimeout(timer);
    }
  }

  const valid = results.filter((r) => r.valid).length;
  const acceptable = results.filter((r) => r.acceptable).length;
  const summary = {
    evaluatedAt: new Date().toISOString(),
    provider: aiConfig.provider,
    modelId: aiConfig.modelId,
    promptVersion: PROMPT_VERSION,
    cases: results.length,
    schemaValid: valid,
    categoryAcceptable: acceptable,
    results,
  };
  const dir = join(__dirname, "../../../docs/ai-proof");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "eval-latest.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(`\nSchema-valid: ${valid}/${results.length} · Category acceptable: ${acceptable}/${results.length}`);
  console.log("Written: docs/ai-proof/eval-latest.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

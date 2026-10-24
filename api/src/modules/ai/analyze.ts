import type { IModels } from "../../models.ts";
import { aiConfig } from "../../config.ts";
import type { IIncidentDocument } from "../incidents/definitions.ts";
import { classifyAiFailure, createGemmaClient, type GemmaClient } from "./gemma.ts";
import { buildUserPrompt } from "./prompt.ts";
import { PROMPT_VERSION, parseAiOutput } from "./schema.ts";

export interface AnalyzeDeps {
  /** Injectable for tests. Defaults to the real Gemma 4 client. */
  client?: () => GemmaClient;
  timeoutMs?: number;
  now?: () => Date;
}

/**
 * Runs AFTER the incident is committed. Never awaited by the SOS mutation.
 * Writes exactly one `happy2help_ai_analyses` row per incident:
 *   PENDING → READY | FAILED, or SKIPPED when there is nothing to analyse / AI is off.
 */
export async function analyzeIncident(
  models: IModels,
  incident: IIncidentDocument,
  zoneNameMn: string,
  deps: AnalyzeDeps = {},
): Promise<void> {
  const now = deps.now ?? (() => new Date());
  const base = {
    tenantId: incident.tenantId,
    schoolId: incident.schoolId,
    incidentId: String(incident._id),
    provider: aiConfig.provider,
    modelId: aiConfig.modelId,
    promptVersion: PROMPT_VERSION,
  };

  const description = (incident.description ?? "").trim();
  if (!description) {
    await models.AiAnalyses.updateOne(
      { tenantId: base.tenantId, schoolId: base.schoolId, incidentId: base.incidentId },
      { $setOnInsert: { ...base, requestedAt: now() }, $set: { state: "SKIPPED", failureReason: "NO_DESCRIPTION" } },
      { upsert: true },
    );
    return;
  }
  if (!aiConfig.enabled && !deps.client) {
    await models.AiAnalyses.updateOne(
      { tenantId: base.tenantId, schoolId: base.schoolId, incidentId: base.incidentId },
      { $setOnInsert: { ...base, requestedAt: now() }, $set: { state: "SKIPPED", failureReason: "AI_NOT_CONFIGURED" } },
      { upsert: true },
    );
    return;
  }

  const requestedAt = now();
  await models.AiAnalyses.updateOne(
    { tenantId: base.tenantId, schoolId: base.schoolId, incidentId: base.incidentId },
    { $setOnInsert: { ...base, requestedAt }, $set: { state: "PENDING" } },
    { upsert: true },
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("TIMEOUT")), deps.timeoutMs ?? aiConfig.timeoutMs);
  try {
    const client = (deps.client ?? createGemmaClient)();
    const prompt = buildUserPrompt({ category: incident.category, zoneNameMn, description });
    const started = Date.now();
    const { text, modelId } = await client.generate(prompt, controller.signal);
    const output = parseAiOutput(text);
    await models.AiAnalyses.updateOne(
      { tenantId: base.tenantId, schoolId: base.schoolId, incidentId: base.incidentId },
      {
        $set: {
          state: "READY",
          modelId,
          summaryMn: output.summaryMn,
          categorySuggestion: output.categorySuggestion,
          urgency: output.urgency,
          confidence: output.confidence,
          riskIndicatorsMn: output.riskIndicatorsMn,
          teacherActionsMn: output.teacherActionsMn,
          uncertaintyNoteMn: output.uncertaintyNoteMn,
          generatedAt: now(),
          latencyMs: Date.now() - started,
          failureReason: undefined,
        },
      },
    );
  } catch (error) {
    const reason = classifyAiFailure(error);
    await models.AiAnalyses.updateOne(
      { tenantId: base.tenantId, schoolId: base.schoolId, incidentId: base.incidentId },
      { $set: { state: "FAILED", failureReason: reason, generatedAt: now() } },
    );
  } finally {
    clearTimeout(timer);
  }
}

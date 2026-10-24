import { z } from "zod";

/**
 * Strict contract for what Gemma 4 may return. Anything outside it is rejected
 * and the analysis is stored as FAILED — never shown as a live AI result.
 * `UNCLEAR` exists so the model can decline to classify instead of guessing.
 */
export const AI_CATEGORY_SUGGESTIONS = ["BULLYING", "UNSAFE", "WELLBEING", "OTHER", "UNCLEAR"] as const;
export const AI_URGENCY = ["LOW", "MEDIUM", "HIGH", "UNCLEAR"] as const;
export const AI_CONFIDENCE = ["LOW", "MEDIUM", "HIGH"] as const;

const shortMn = (max: number) => z.string().trim().min(1).max(max);

export const aiAnalysisOutputSchema = z
  .object({
    categorySuggestion: z.enum(AI_CATEGORY_SUGGESTIONS),
    urgency: z.enum(AI_URGENCY),
    confidence: z.enum(AI_CONFIDENCE),
    summaryMn: shortMn(400),
    riskIndicatorsMn: z.array(shortMn(120)).max(5).default([]),
    teacherActionsMn: z.array(shortMn(160)).min(1).max(5),
    uncertaintyNoteMn: z.string().trim().max(200).optional(),
  })
  .strict();

export type AiAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;

export const PROMPT_VERSION = "happy-ai-gemma4-v1";

/** Extracts the first JSON object from a model reply (tolerates ```json fences and prose). */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("NO_JSON_OBJECT");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Parses + validates a raw model reply. Throws on anything that is not a conforming object. */
export function parseAiOutput(text: string): AiAnalysisOutput {
  if (text.length > 20_000) throw new Error("REPLY_TOO_LONG");
  return aiAnalysisOutputSchema.parse(extractJsonObject(text));
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// erxes.json sits at the repository root, two levels above both src/ and dist/.
const manifestSchema = z.object({
  name: z.string(),
  title: z.string(),
  version: z.string(),
  api: z.object({
    port: z.number().int(),
    graphql: z.string(),
    health: z.string(),
  }),
});

export const manifest = manifestSchema.parse(
  JSON.parse(readFileSync(join(__dirname, "../../erxes.json"), "utf8")),
);

const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(manifest.api.port),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: optional,
  MONGO_URL: optional,
  LOAD_BALANCER_ADDRESS: optional,
  RELEASE_VERSION: optional,

  /** HMAC secret for school-location QR codes (see modules/school/qr.ts). */
  HAPPY2HELP_QR_SECRET: z.string().min(16, "HAPPY2HELP_QR_SECRET must be >= 16 chars"),

  // Happy AI = Gemma 4 (open-weight) through a hosted inference endpoint.
  // No key = AI disabled; the SOS flow is unchanged and analyses are stored as SKIPPED.
  // OpenRouter is the project's inference provider; the Gemini path is kept only as an opt-in legacy adapter.
  OPENROUTER_API_KEY: optional,
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  /** Gemma 4 slug on OpenRouter, e.g. google/gemma-4-26b-a4b-it or google/gemma-4-26b-a4b-it:free */
  OPENROUTER_MODEL: optional,
  GEMINI_API_KEY: optional,
  HAPPY_AI_PROVIDER: z.enum(["auto", "gemini", "openrouter"]).default("auto"),
  /** Legacy alias of OPENROUTER_MODEL (OPENROUTER_MODEL wins when both are set). */
  HAPPY_AI_MODEL: optional,
  /** Comma-separated Gemma 4 slugs tried in order when the configured one is rate-limited / out of credits. */
  HAPPY_AI_FALLBACK_MODELS: optional,
  HAPPY_AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(25_000),
  HAPPY_AI_MAX_CALLS_PER_PROCESS: z.coerce.number().int().min(0).default(500),
});

export const env = envSchema.parse(process.env);

const resolvedProvider: "google-gemini-api" | "openrouter" | "none" =
  env.HAPPY_AI_PROVIDER === "gemini"
    ? env.GEMINI_API_KEY ? "google-gemini-api" : "none"
    : env.HAPPY_AI_PROVIDER === "openrouter"
      ? env.OPENROUTER_API_KEY ? "openrouter" : "none"
      : env.OPENROUTER_API_KEY ? "openrouter" : env.GEMINI_API_KEY ? "google-gemini-api" : "none";

const openRouterModel = env.OPENROUTER_MODEL || env.HAPPY_AI_MODEL || "google/gemma-4-26b-a4b-it";

export const aiConfig = {
  enabled: resolvedProvider !== "none",
  provider: resolvedProvider,
  modelId: resolvedProvider === "google-gemini-api" ? env.HAPPY_AI_MODEL || "gemma-4-26b-a4b-it" : openRouterModel,
  fallbackModels: (env.HAPPY_AI_FALLBACK_MODELS ?? (resolvedProvider === "openrouter" ? "google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it,google/gemma-4-31b-it" : ""))
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  openRouterBaseUrl: env.OPENROUTER_BASE_URL.replace(/\/+$/, ""),
  geminiKey: env.GEMINI_API_KEY,
  openRouterKey: env.OPENROUTER_API_KEY,
  timeoutMs: env.HAPPY_AI_TIMEOUT_MS,
  maxCallsPerProcess: env.HAPPY_AI_MAX_CALLS_PER_PROCESS,
};

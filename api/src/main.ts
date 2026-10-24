import { startPlugin } from "erxes-api-shared/utils";
import { aiConfig, manifest } from "./config.ts";
import { generateModels } from "./connectionResolvers.ts";
import { ensureIndexes } from "./models.ts";
import { retryFailedAnalyses } from "./modules/ai/retry.ts";
import { resolvers, typeDefs } from "./graphql/schema.ts";
import { permissions } from "./permissions.ts";

// startPlugin (official erxes-api-shared) serves the federated subgraph on
// /graphql, mounts /health, decodes the gateway's forwarded `user` / `cpuser` /
// `clientportal` headers into the context and registers this service with the
// erxes gateway through Redis service discovery.
startPlugin({
  name: manifest.name,
  port: manifest.api.port,
  meta: { permissions },
  graphql: async () => ({ typeDefs, resolvers }),
  apolloServerContext: async (subdomain, context) => {
    context.models = await generateModels(subdomain, context);
    await ensureIndexes(context.models);
    return context;
  },
}).then(() => {
  console.log(
    `[happy2help] v${manifest.version} · Happy AI: ${
      aiConfig.enabled ? `enabled (${aiConfig.provider} · ${aiConfig.modelId})` : "disabled (no OPENROUTER_API_KEY) — SOS flow unaffected"
    }`,
  );
  startAiRetrySweeper();
});

/**
 * Recoverable AI jobs: every 90 s, re-run one retryable FAILED analysis (QUOTA / TIMEOUT / NETWORK) per
 * listed tenant, at most MAX_ATTEMPTS calls per incident. Off when AI is disabled or under tests.
 * Tenants: HAPPY2HELP_AI_RETRY_TENANTS (comma-separated) or the demo tenant HAPPY2HELP_TENANT.
 */
function startAiRetrySweeper() {
  if (!aiConfig.enabled || process.env.NODE_ENV === "test") return;
  const tenants = (process.env.HAPPY2HELP_AI_RETRY_TENANTS || process.env.HAPPY2HELP_TENANT || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tenants.length === 0) return;
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      for (const tenant of tenants) {
        const models = await generateModels(tenant);
        await ensureIndexes(models);
        const ran = await retryFailedAnalyses(models);
        if (ran) console.log(`[happy2help] AI retry sweep · tenant ${tenant} · re-ran ${ran}`);
      }
    } catch (error) {
      console.error("[happy2help] AI retry sweep failed", error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  }, 90_000);
  timer.unref();
}

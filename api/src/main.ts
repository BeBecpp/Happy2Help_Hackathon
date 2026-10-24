import { startPlugin } from "erxes-api-shared/utils";
import { aiConfig, manifest } from "./config.ts";
import { generateModels } from "./connectionResolvers.ts";
import { ensureIndexes } from "./models.ts";
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
      aiConfig.enabled ? `enabled (${aiConfig.provider} · ${aiConfig.modelId})` : "disabled (no GEMINI_API_KEY) — SOS flow unaffected"
    }`,
  );
});

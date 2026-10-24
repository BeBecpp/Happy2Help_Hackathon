import "server-only";

/**
 * Two upstream modes, chosen by H2H_MODE:
 *
 *  gateway    — production shape. The browser never sees erxes. The BFF logs users in
 *               through the erxes gateway (`login` for team members, Client Portal login
 *               for students), keeps the tokens in an HttpOnly cookie and forwards them to
 *               ERXES_GRAPHQL_URL. The gateway authenticates and forwards identity to the plugin.
 *
 *  dev-direct — explicitly labelled LOCAL DEVELOPMENT mode for a laptop without Docker.
 *               The BFF talks to the plugin's own subgraph (H2H_PLUGIN_GRAPHQL_URL) and sets
 *               the same base64 `user` / `cpuser` headers the gateway would set, for the
 *               fictional demo personas only. It is never used at a real erxes host and is
 *               shown as "Хөгжүүлэлтийн горим" in the UI.
 */
export type Mode = "gateway" | "dev-direct";

const isProduction = process.env.NODE_ENV === "production";
const requestedMode = process.env.H2H_MODE;
// Fail closed: a production build only runs dev-direct when explicitly asked for it; an unset or unknown
// H2H_MODE means gateway, so a forgotten variable can never expose the fictional persona switcher.
const mode: Mode = requestedMode === "gateway" ? "gateway" : requestedMode === "dev-direct" || !isProduction ? "dev-direct" : "gateway";

/**
 * One-tap fictional personas are allowed in development, and in a production build only with the explicit
 * opt-in H2H_ALLOW_DEMO_PERSONAS=fictional-local-only (judging laptop / CI on localhost). Never on a public host.
 */
export const demoPersonasAllowed = mode === "dev-direct" && (!isProduction || process.env.H2H_ALLOW_DEMO_PERSONAS === "fictional-local-only");

export const serverConfig = {
  mode,
  pluginGraphqlUrl: process.env.H2H_PLUGIN_GRAPHQL_URL || "http://localhost:3399/graphql",
  erxesGraphqlUrl: process.env.ERXES_GRAPHQL_URL || "",
  /** Client Portal app token (gateway mode): identifies the portal students log in through. */
  erxesClientPortalAppToken: process.env.ERXES_CP_APP_TOKEN || "",
  erxesClientPortalId: process.env.ERXES_CP_ID || "",
  sessionSecret: process.env.H2H_SESSION_SECRET || "",
  /** Tenant hostname forwarded in dev-direct mode (the gateway derives it from the request host). */
  tenantHost: process.env.HAPPY2HELP_TENANT || "localhost",
};

export function assertServerConfig() {
  if (!serverConfig.sessionSecret || serverConfig.sessionSecret.length < 32) {
    throw new Error("H2H_SESSION_SECRET (>= 32 chars) is required. `node tools/dev-stack.mjs` writes one to .env.runtime.");
  }
  if (serverConfig.mode === "gateway" && !serverConfig.erxesGraphqlUrl) {
    throw new Error("ERXES_GRAPHQL_URL is required in gateway mode.");
  }
  if (serverConfig.mode === "dev-direct" && !demoPersonasAllowed) {
    throw new Error("dev-direct (fictional persona sign-in) is disabled in production. Use H2H_MODE=gateway behind an erxes gateway.");
  }
}

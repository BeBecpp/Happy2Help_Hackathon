import "server-only";
import { serverConfig } from "./config";
import { OPERATIONS, type OperationName } from "./operations";
import type { Session } from "./session";

export interface GraphQLResult<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64");

/** Headers that carry the caller's identity upstream, depending on the mode. */
function identityHeaders(session: Session | null): Record<string, string> {
  if (!session) return {};
  if (session.mode === "gateway") {
    if (session.kind === "staff") return { Authorization: `Bearer ${session.token}` };
    return {
      "x-app-token": serverConfig.erxesClientPortalAppToken,
      "client-auth-token": session.token,
    };
  }
  // dev-direct: what the erxes gateway would forward to the subgraph for this principal.
  if (session.kind === "staff") {
    return {
      user: b64({ _id: session.principalId, email: session.email, username: session.personaKey }),
      userid: session.principalId,
    };
  }
  return {
    cpuser: b64({ _id: session.principalId, email: session.email }),
    clientportal: b64({ _id: "cp-demo-portal", name: "Happy2Help DEMO portal" }),
  };
}

export async function callPlugin<T = unknown>(
  operation: OperationName,
  variables: Record<string, unknown>,
  session: Session | null,
): Promise<GraphQLResult<T>> {
  const url = serverConfig.mode === "gateway" ? serverConfig.erxesGraphqlUrl : serverConfig.pluginGraphqlUrl;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...identityHeaders(session),
  };
  if (serverConfig.mode === "dev-direct") headers.hostname = serverConfig.tenantHost;
  const controller = new AbortController();
  // Model inference (with bounded provider retries) can outlast an ordinary request.
  const timer = setTimeout(() => controller.abort(), operation === "AssistantAsk" ? 45_000 : 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ operationName: operation, query: OPERATIONS[operation], variables }),
      signal: controller.signal,
      cache: "no-store",
    });
    const json = (await res.json()) as GraphQLResult<T>;
    if (!res.ok && !json.errors) {
      return { errors: [{ message: `upstream ${res.status}`, extensions: { code: "TEMPORARY_FAILURE" } }] };
    }
    return json;
  } catch {
    return { errors: [{ message: "upstream unreachable", extensions: { code: "TEMPORARY_FAILURE" } }] };
  } finally {
    clearTimeout(timer);
  }
}

/** Gateway-mode only: raw erxes core call (login mutations). */
export async function callErxesCore<T = unknown>(query: string, variables: Record<string, unknown>): Promise<GraphQLResult<T>> {
  const res = await fetch(serverConfig.erxesGraphqlUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  return (await res.json()) as GraphQLResult<T>;
}
